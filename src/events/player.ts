import { Context, Markup, NarrowedContext } from "telegraf";
import { Action, Command, On } from "../decorators/bot.decorator";
import { PlayCurrentSong } from "../func/utils";
import { PlayFromHome } from "../func/player";
import {
  addQueue,
  addToPlayNext,
  getQueue,
  getQueues,
  updateFinished,
} from "../repository/queue";
import {
  SearchResultWeb,
  SearchWordApi,
  addSearchResults,
  getSearchResult,
} from "../func/search";
import { PrismaClient, Subscriber } from "@prisma/client";
import {
  getSubscribedList,
  getSubscriberByChatID,
  subscribe,
  unsubscribe,
} from "../repository/subscriber";
import {
  CallbackQuery,
  InlineQueryResult,
  Message,
  Update,
} from "telegraf/typings/core/types/typegram";

const prisma = new PrismaClient();

export class Player {
  @Command("pause")
  async pause(ctx: Context) {
    if (globalThis.statusPlay !== "playing") {
      ctx.reply("NOTHING PLAYED");
      return;
    }
    try {
      // wait for play mode, make sure is playing
      await globalThis.playerPage.waitForSelector(
        `#play-pause-button[title="Pause"]:not([hidden])`,
      );
      // pause (prevent playing unwanted next song)
      await globalThis.playerPage.click(
        `#play-pause-button[title="Pause"]:not([hidden])`,
      );
      // update status play
      globalThis.statusPlay = "paused";
      ctx.reply("PAUSED");
    } catch (error) {
      ctx.reply("Failed to pause");
    }
  }

  @Command("play")
  async play(ctx: Context) {
    if (globalThis.statusPlay == "playing") {
      ctx.reply("ITS CURRENTLY PLAYING");
      return;
    } else if (globalThis.statusPlay == "paused") {
      try {
        // wait for play mode, make sure is playing
        await globalThis.playerPage.waitForSelector(
          `#play-pause-button[title="Play"]:not([hidden])`,
        );

        // pause (prevent playing unwanted next song)
        await globalThis.playerPage.click(
          `#play-pause-button[title="Play"]:not([hidden])`,
        );

        // update status play
        globalThis.statusPlay = "playing";

        ctx.reply("RESUMING PLAYER");
      } catch (error) {
        ctx.reply("Failed to play");
      }
      return;
    }

    PlayCurrentSong(true);
  }

  @Command("info")
  info(ctx: Context) {
    if (globalThis.statusPlay !== "playing") {
      ctx.reply("NOTHING PLAYED");
      return;
    }

    ctx.reply(
      `Now playing ${globalThis.currentQueue.title} by ${globalThis.currentQueue.artist} [${globalThis.currentQueue.duration}]`,
    );
  }

  @Command("lyrics")
  async lyrics(ctx: Context) {
    if (globalThis.statusPlay !== "playing") {
      ctx.reply("NOTHING PLAYED");
      return;
    }

    await globalThis.playerPage.waitForSelector(
      ".tab-header.style-scope.ytmusic-player-page:nth-of-type(2)",
    );

    let lyrics = "Lyrics not available";
    if (
      (await globalThis.playerPage.$(
        ".tab-header.style-scope.ytmusic-player-page:nth-of-type(2):not([disabled])",
      )) !== null
    ) {
      await globalThis.playerPage.click(
        ".tab-header.style-scope.ytmusic-player-page:nth-of-type(2)",
      );
      const lyricEl = await globalThis.playerPage.waitForSelector(
        ".non-expandable.description.ytmusic-description-shelf-renderer",
      );

      lyrics = (await lyricEl?.evaluate((el) => el.textContent)) || lyrics;

      const lyricDescEl = await globalThis.playerPage.waitForSelector(
        ".footer.ytmusic-description-shelf-renderer",
      );
      const lyricsDesc = await lyricDescEl?.evaluate((el) => el.textContent);
      if (lyricsDesc) {
        lyrics += `\n\n<code>${lyricsDesc}</code>`;
      }
    }

    ctx.reply(lyrics, {
      parse_mode: "HTML",
    });
  }

  @Command("trending")
  trending(ctx: Context) {
    PlayFromHome(globalThis.playerPage, "TRENDING");
    ctx.reply("Playing from trending");
  }

  @Command("quick_pick")
  quickPick(ctx: Context) {
    ctx.reply("Playing from quick pick");
    PlayFromHome(globalThis.playerPage, "QUICK_PICK");
  }

  @Command("queue")
  async queue(ctx: Context) {
    const queues = await getQueues(prisma);
    if (queues.length > 0) {
      ctx;
      await ctx.reply(
        queues
          .map((row, i) => {
            return `${i + 1}. [${row.duration}] ${row.title} - ${row.artist}`;
          })
          .join("\n"),
        {
          parse_mode: "HTML",
        },
      );
    } else {
      ctx.reply("No queue");
    }
  }

  @Command("next")
  async nextHandler(ctx: Context) {
    {
      if (ctx.message?.from.id != 233041497) {
        ctx.reply("HEI!!");
        return;
      }

      if (globalThis.statusPlay !== "playing") {
        ctx.reply("NOTHING PLAYED");
        return;
      }

      this.next();
    }
  }

  @Command("subscribe")
  async subscribe(ctx: Context) {
    {
      if (!ctx.chat?.id) return;
      const subscriber: Subscriber | null = await getSubscriberByChatID(
        prisma,
        ctx?.chat?.id,
      );
      if (subscriber !== null) {
        await ctx.reply("This chat already subscribed", {
          parse_mode: "Markdown",
        });
      } else {
        await subscribe(prisma, {
          chatID: ctx.chat.id,
          username: ctx?.message?.from.username ?? "",
          name:
            ctx.chat.type == "private"
              ? `${ctx?.message?.from.first_name}${ctx?.message?.from.last_name ? ` ${ctx.message.from.last_name}` : ""}`
              : ctx.chat.title,
          type: ctx.chat.type,
        });

        await ctx.reply("This chat is subscribed to bot", {
          parse_mode: "Markdown",
        });
      }
    }
  }

  @Command("unsubscribe")
  async unsubscribe(ctx: Context) {
    if (!ctx?.chat?.id) return;
    const subscriber: Subscriber | null = await getSubscriberByChatID(
      prisma,
      ctx?.chat?.id,
    );
    if (subscriber === null) {
      await ctx.reply("This chat is not subscribed", {
        parse_mode: "Markdown",
      });
    } else {
      await unsubscribe(prisma, subscriber);

      await ctx.reply("This chat is no longer subscribed to bot", {
        parse_mode: "Markdown",
      });
    }
  }

  @Command("subscriber")
  async subscriber(
    ctx: Context<{
      message: Update.New & Update.NonChannel & Message.TextMessage;
      update_id: number;
    }> &
      Omit<Context<Update>, keyof Context<Update>>,
  ) {
    const subscribers: Subscriber[] = await getSubscribedList(prisma);
    if (subscribers.length === 0) {
      await ctx.reply("No Subscriber", {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply(
        subscribers
          .map((row, i) => {
            return `${i + 1}. [[${row.type}]] ${row.type == "private" ? `[${row.name}](tg://user?id=${row.chatID})` : `${row.name}`}`;
          })
          .join("\n"),
        {
          parse_mode: "Markdown",
        },
      );
    }
  }

  @Command("vote_next")
  async vote_next(
    ctx: Context<{
      message: Update.New & Update.NonChannel & Message.TextMessage;
      update_id: number;
    }> &
      Omit<Context<Update>, keyof Context<Update>>,
  ) {
    if (globalThis.statusPlay !== "playing") {
      ctx.reply("NOTHING PLAYED");
      return;
    }

    if (globalThis.votePlayNextCount <= globalThis.votePlayNextMinimum) {
      if (!globalThis.votePlayNextUsers.includes(ctx.message?.from.id)) {
        globalThis.votePlayNextCount++;
        globalThis.votePlayNextUsers.push(ctx.message?.from.id);
        ctx.reply(
          `Voting for next ${globalThis.votePlayNextCount}/${globalThis.votePlayNextMinimum}`,
        );
      } else {
        ctx.reply("You can only vote once per song!!");
      }
    } else {
      this.next();
    }
  }

  @On("inline_query")
  async inlineQuery(
    ctx: NarrowedContext<Context<Update>, Update.InlineQueryUpdate>,
  ) {
    try {
      if (ctx.inlineQuery.query == "") {
        await ctx.answerInlineQuery([]);
        return;
      }

      if (ctx?.inlineQuery && ctx?.inlineQuery.query?.length < 3) {
        await ctx.answerInlineQuery([]);
        return;
      }

      if (globalThis.timer != null) {
        clearTimeout(globalThis.timer);
      }

      globalThis.timer = setTimeout(async () => {
        console.log(`Search for: ${ctx.inlineQuery.query}`);

        // search data
        const searchResults = await SearchWordApi(ctx.inlineQuery.query ?? "");

        // save result
        addSearchResults(prisma, searchResults);

        // Using context shortcut
        await ctx.answerInlineQuery(
          searchResults.map(
            (row: SearchResultWeb): InlineQueryResult => ({
              id: `${row.musicID}`,
              type: "article",
              title: row.title,
              description: `${row.artist} • ${row.album} • ${row.duration}`,
              thumbnail_url: row.thumbnail,
              input_message_content: {
                photo_url: row.thumbnail,
                message_text: `${row.title} by ${row.artist}`,
              },
              ...Markup.inlineKeyboard([
                // [
                //   Markup.button.callback(
                //     "Play Next",
                //     `play-this-next-${ctx.from.id}:${row.musicID}`,
                //   ),
                // ],
                [
                  Markup.button.callback(
                    "Add to Queue",
                    `add-to-queue-${ctx.from.id}:${row.musicID}`,
                  ),
                  // ],
                  // [
                  Markup.button.callback(
                    "Cancel",
                    `cancel-${ctx.from.id}:${row.musicID}`,
                  ),
                ],
              ]),
            }),
          ),
        );
      }, 1500);
    } catch (error) {
      console.error("inlineQuery:error:", error);
    }
  }

  @Action(/^(add-to-queue-)/g)
  async playNext(
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery>> &
      Omit<Context<Update>, keyof Context<Update>> & {
        match: RegExpExecArray;
      },
  ) {
    try {
      const rawData: string = ctx.match.input.split("add-to-queue-")[1] || "";
      const musicID: string = rawData.split(":")[1] || "";
      const userID: number = parseInt(rawData.split(":")[0] || "");
      const clickerID: number = ctx.callbackQuery.from.id;
      if (clickerID !== userID) {
        await ctx.answerCbQuery("Who TF r u!");
      } else {
        await ctx.answerCbQuery("Adding song to queue...");
        if (musicID) {
          const sr = await getSearchResult(prisma, musicID);
          if (sr !== false) {
            await ctx.editMessageText(
              `${sr.title} by ${sr.artist} added to queue`,
            );
            addQueue(prisma, sr);
          }
        }
      }
    } catch (err) {
      console.error("playNext error:", err);
    }
  }

  @Action(/^(play-this-next-)/g)
  async playThisNext(
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery>> &
      Omit<Context<Update>, keyof Context<Update>> & {
        match: RegExpExecArray;
      },
  ) {
    const rawData: string = ctx.match.input.split("play-this-next-")[1] || "";
    const musicID: string = rawData.split(":")[1] || "";
    const userID: number = parseInt(rawData.split(":")[0] || "");
    const clickerID: number = ctx.callbackQuery.from.id;
    if (clickerID !== userID) {
      await ctx.answerCbQuery("Who TF r u!");
    } else {
      await ctx.answerCbQuery("Adding song to play next...");
      if (musicID) {
        const sr = await getSearchResult(prisma, musicID);
        if (sr !== false) {
          await ctx.editMessageText(
            `${sr.title} by ${sr.artist} added to play next`,
          );
          addToPlayNext(prisma, sr);
        }
      }
    }
  }

  @Action(/^(cancel-)/g)
  async cancel(
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery>> &
      Omit<Context<Update>, keyof Context<Update>> & {
        match: RegExpExecArray;
      },
  ) {
    const rawData: string = ctx.match.input.split("cancel-")[1] || "";
    const userID: number = parseInt(rawData.split(":")[0] || "");
    const clickerID: number = ctx.callbackQuery.from.id;
    if (clickerID !== userID) {
      await ctx.answerCbQuery("Who TF r u!");
    } else {
      await ctx.answerCbQuery("Canceling...");
      await ctx.editMessageText("Canceled");
    }
  }

  private async next() {
    // get next queue
    const [nextExist, nextQueue] = await getQueue(prisma);

    // if there is queue
    if (nextExist && nextQueue !== null) {
      // stop interval checking dom
      clearInterval(globalThis.playerTimer);

      // bypass "Leave site?"
      await globalThis.playerPage.click(
        `#play-pause-button[title="Pause"]:not([hidden])`,
      );

      // await page.evaluate(() => {
      //   window.onbeforeunload = null;
      // });

      // set finish
      if (
        globalThis.currentQueue.id > 0 &&
        globalThis.currentQueue.finishedAt == null
      ) {
        await updateFinished(prisma, globalThis.currentQueue);
      }

      // set currentQueue to nextQueue
      globalThis.currentQueue = nextQueue;

      // update current title (it should the same even the source is different)
      globalThis.currentTitle = nextQueue.title;

      // play current song with refresh
      await PlayCurrentSong(true);
    } else {
      // click next song
      await playerPage.click(`.ytmusic-player-bar[title="Next"]`);
    }
  }
}
