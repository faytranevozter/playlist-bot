import puppeteer from "puppeteer-extra";
import { GetCurrentPlaying, PlayDirectURL, PlayFromHome } from "./player";
import { Markup, Telegraf } from "telegraf";
import { PrismaClient, Queue, Subscriber } from "@prisma/client";
import { initCookies } from "./cookies";
import Adblocker from "puppeteer-extra-plugin-adblocker";
import { Browser, Page } from "puppeteer";
import { botToken } from "./config";
import { PuppeteerBlocker } from "@cliqz/adblocker-puppeteer";
import {
  SearchResultWeb,
  SearchWordApi,
  addSearchResults,
  getSearchResult,
} from "./search";
import { InlineQueryResult } from "telegraf/typings/core/types/typegram";
import {
  addQueue,
  getQueue,
  getQueues,
  addToPlayNext,
  updateFinished,
  updateIsPlaying,
  updatePlayedAt,
} from "./queue";
import {
  getSubscribedList,
  getSubscriberByChatID,
  subscribe,
  unsubscribe,
} from "./subscriber";
import dayjs, { type Dayjs } from "dayjs";
import { Player } from "./events/player";

(async () => {
  const prisma = new PrismaClient();

  // Launch the browser
  const browser: Browser = await puppeteer
    .use(Adblocker({ blockTrackers: true }))
    // .use(StealthPlugin())
    .launch({
      // headless: false,
      headless: "new",
      ignoreDefaultArgs: ["--mute-audio"],
      args: [
        '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:86.0) Gecko/20100101 Firefox/86.0"',
        "--autoplay-policy=no-user-gesture-required",
      ],
      defaultViewport: null,
    });

  new Player();

  // get pages
  const pages: Page[] = await browser.pages();
  let playerPage: Page = pages[0];

  PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInPage(playerPage);
  });

  // init cookies
  initCookies();

  // init BOT
  const bot = new Telegraf(botToken);
  bot.start((ctx) => ctx.reply("Welcome"));

  // define status player
  let statusPlay: "playing" | "paused" | "idle" = "idle";

  // get queue if exist
  let currentQueue: Queue;
  const [exist, lastQueue] = await getQueue(prisma);
  if (!exist) {
    currentQueue = {
      id: 0,
      musicID: "watch?v=paCm-W8EURI",
      title: "On The Night Like This",
      artist: "Mocca",
      thumbnail:
        "https://lh3.googleusercontent.com/iEZF6i3V3KL02o0DrmOy4ZkD0BCW8pUy08X1w2UvkcwcdMZiFXxl8wsL4JTBqgIVD0wG56lp6Z6F10h6=w120-h120-l90-rj",
      album: "Friends",
      year: "",
      duration: "1:22",
      duration_second: 82,
      total_play: "1.3M plays",
      playedAt: null,
      finishedAt: null,
      isPlaying: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } else if (lastQueue !== null) {
    currentQueue = lastQueue;
  }

  bot.command("fixplayer", async () => {
    if (statusPlay == "playing") {
      statusPlay = "paused";
      return;
    } else if (statusPlay == "paused") {
      statusPlay = "playing";
      return;
    }
  });

  // const sendMessage = async (message) => {
  //   return bot.telegram.sendMessage(233041497, message);
  // };

  const subscribersID: string[] = [];
  let expiredCache: Dayjs = dayjs();
  const sendMessageToSubscriber = async (message: string) => {
    if (expiredCache.isBefore(dayjs())) {
      const subscribers = await getSubscribedList(prisma);
      subscribersID.length = 0;
      for (let i = 0; i < subscribers.length; i++) {
        const s = subscribers[i];
        subscribersID.push(s.chatID.toString());
      }
      expiredCache = dayjs().add(5, "minutes");
    }
    subscribersID.forEach((chatID) => {
      bot.telegram.sendMessage(chatID, message);
    });
  };

  let playerTimer: NodeJS.Timeout;

  let currentTitle: string | null = null;
  let newTitle: string | null = null;
  const LocalMonitor = async () => {
    try {
      if (playerPage.isClosed()) {
        clearInterval(playerTimer);
      }

      await playerPage.waitForSelector(".ytmusic-player-bar .title");
      newTitle =
        (await (
          await playerPage.$(".ytmusic-player-bar .title")
        )?.evaluate((el) => el.textContent || "")) || "";

      // console.log(`"${currentTitle}"=="${newTitle}"`);

      if (newTitle != currentTitle) {
        // on really change
        if (currentTitle !== null) {
          // clear interval (stop monitoring)
          clearInterval(playerTimer);

          // wait for play mode, make sure is playing
          await playerPage.waitForSelector(
            `#play-pause-button[title="Pause"]:not([hidden])`,
          );

          // pause (prevent playing unwanted next song)
          await playerPage.click(
            `#play-pause-button[title="Pause"]:not([hidden])`,
          );
          // await playerPage.keyboard.press("Space");

          // set finish
          if (currentQueue.id > 0 && currentQueue.finishedAt == null) {
            await updateFinished(prisma, currentQueue);
          }

          // check next queue
          const [nextExist, nextQueue] = await getQueue(prisma);
          if (nextExist && nextQueue != null) {
            // set currentQueue to nextQueue
            currentQueue = nextQueue;

            // update current title (it should the same even the source is different)
            currentTitle = nextQueue.title;

            // play current song with refresh
            await PlayCurrentSong(true);
          } else {
            // wait for play mode, make sure is playing
            await playerPage.waitForSelector(
              `#play-pause-button[title="Play"]:not([hidden])`,
            );
            // resume
            await playerPage.click(
              `#play-pause-button[title="Play"]:not([hidden])`,
            );

            // change current play & currentTitle
            currentQueue = await GetCurrentPlaying(playerPage);
            currentTitle = currentQueue.title;

            // send notification
            sendNotificationCurrentPlaying();

            // monitoring dom (again)
            MonitoringEndSong();
          }
        } else {
          currentTitle = newTitle;
        }
      }
    } catch (error) {
      console.error("---------------");
      console.error(error);
      console.error("---------------");
    }
  };

  const MonitoringEndSong = () => {
    // console.log("MonitoringEndSong: monitoring dom");
    if (playerTimer != null) {
      clearInterval(playerTimer);
    }

    playerTimer = setInterval(LocalMonitor, 500);
  };

  const sendNotificationCurrentPlaying = async () => {
    console.log(
      `PlayCurrentSong Playing ${currentQueue.title} by ${currentQueue.artist}`,
    );
    await sendMessageToSubscriber(
      `Playing ${currentQueue.title} by ${currentQueue.artist}`,
    );
  };

  const PlayCurrentSong = async (openWithRefreshPage: boolean) => {
    if (playerPage.isClosed()) {
      // open new tab
      playerPage = await browser.newPage();
    }

    // playing song
    if (openWithRefreshPage) {
      // open browser
      await PlayDirectURL(playerPage, currentQueue);
    }

    // update is playing (global variable)
    statusPlay = "playing";

    // update db
    if (currentQueue.id > 0) {
      await updateIsPlaying(prisma, currentQueue, true);
      await updatePlayedAt(prisma, currentQueue);
    }

    // send notification
    sendNotificationCurrentPlaying();

    // monitoring dom on change song (after song end)
    MonitoringEndSong();
  };

  bot.command("play", async (ctx) => {
    if (statusPlay == "playing") {
      ctx.reply("ITS CURRENTLY PLAYING");
      return;
    } else if (statusPlay == "paused") {
      try {
        // wait for play mode, make sure is playing
        await playerPage.waitForSelector(
          `#play-pause-button[title="Play"]:not([hidden])`,
        );

        // pause (prevent playing unwanted next song)
        await playerPage.click(
          `#play-pause-button[title="Play"]:not([hidden])`,
        );

        // update status play
        statusPlay = "playing";

        ctx.reply("RESUMING PLAYER");
      } catch (error) {
        ctx.reply("Failed to play");
      }
      return;
    }

    PlayCurrentSong(true);
  });

  bot.command("pause", async (ctx) => {
    if (statusPlay !== "playing") {
      ctx.reply("NOTHING PLAYED");
      return;
    }

    try {
      // wait for play mode, make sure is playing
      await playerPage.waitForSelector(
        `#play-pause-button[title="Pause"]:not([hidden])`,
      );

      // pause (prevent playing unwanted next song)
      await playerPage.click(`#play-pause-button[title="Pause"]:not([hidden])`);

      // update status play
      statusPlay = "paused";

      ctx.reply("PAUSED");
    } catch (error) {
      ctx.reply("Failed to pause");
    }
  });

  bot.command("info", async (ctx) => {
    if (statusPlay !== "playing") {
      ctx.reply("NOTHING PLAYED");
      return;
    }

    ctx.reply(`Now playing ${currentQueue.title} by ${currentQueue.artist}`);
  });

  bot.command("next", async (ctx) => {
    if (statusPlay !== "playing") {
      ctx.reply("NOTHING PLAYED");
      return;
    }

    // get next queue
    const [nextExist, nextQueue] = await getQueue(prisma);

    // if there is queue
    if (nextExist && nextQueue !== null) {
      // stop interval checking dom
      clearInterval(playerTimer);

      // bypass "Leave site?"
      await playerPage.click(`#play-pause-button[title="Pause"]:not([hidden])`);

      // await page.evaluate(() => {
      //   window.onbeforeunload = null;
      // });

      // set finish
      if (currentQueue.id > 0 && currentQueue.finishedAt == null) {
        await updateFinished(prisma, currentQueue);
      }

      // set currentQueue to nextQueue
      currentQueue = nextQueue;

      // update current title (it should the same even the source is different)
      currentTitle = nextQueue.title;

      // play current song with refresh
      await PlayCurrentSong(true);
    } else {
      // click next song
      await playerPage.click(`.ytmusic-player-bar[title="Next"]`);
    }
  });

  bot.command("quick_pick", async (ctx) => {
    ctx.reply("Playing from quick pick");
    PlayFromHome(playerPage, "QUICK_PICK");
  });

  bot.command("trending", async (ctx) => {
    PlayFromHome(playerPage, "TRENDING");
    ctx.reply("Playing from trending");
  });

  bot.command("queue", async (ctx) => {
    const queues = await getQueues(prisma);
    if (queues.length > 0) {
      await ctx.reply(
        queues
          .map((row, i) => {
            return `${i + 1}. ${row.title} - ${row.artist}`;
          })
          .join("\n"),
        {
          parse_mode: "Markdown",
        },
      );
    } else {
      ctx.reply("No queue");
    }
  });

  bot.command("subscribe", async (ctx) => {
    const subscriber: Subscriber | null = await getSubscriberByChatID(
      prisma,
      ctx.chat.id,
    );
    if (subscriber !== null) {
      await ctx.reply("This chat already subscribed", {
        parse_mode: "Markdown",
      });
    } else {
      await subscribe(prisma, {
        chatID: ctx.chat.id,
        username: ctx.message.from.username ?? "",
        name:
          ctx.chat.type == "private"
            ? `${ctx.message.from.first_name}${ctx.message.from.last_name ? ` ${ctx.message.from.last_name}` : ""}`
            : ctx.chat.title,
        type: ctx.chat.type,
      });

      await ctx.reply("This chat is subscribed to bot", {
        parse_mode: "Markdown",
      });
    }
  });

  bot.command("unsubscribe", async (ctx) => {
    const subscriber: Subscriber | null = await getSubscriberByChatID(
      prisma,
      ctx.chat.id,
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
  });

  bot.command("subscriber", async (ctx) => {
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
  });

  let timer: NodeJS.Timeout | null = null;
  bot.on("inline_query", async (ctx) => {
    if (ctx.inlineQuery.query == "") {
      await ctx.answerInlineQuery([]);
      return;
    }

    if (ctx.inlineQuery.query.length < 3) {
      await ctx.answerInlineQuery([]);
      return;
    }

    if (timer != null) {
      clearTimeout(timer);
    }

    timer = setTimeout(async () => {
      console.log(`Search for: ${ctx.inlineQuery.query}`);

      // search data
      const searchResults = await SearchWordApi(ctx.inlineQuery.query);

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
              message_text: `${row.title} • ${row.artist} • ${row.album} • ${row.duration}`,
            },
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "Play Next",
                  `play-this-next-${row.musicID}`,
                ),
              ],
              [
                Markup.button.callback(
                  "Add to Queue",
                  `add-to-queue-${row.musicID}`,
                ),
              ],
            ]),
          }),
        ),
      );
    }, 1500);
  });

  bot.action(/^(play-this-next-)/g, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const musicID: string = ctx.match.input.split("play-this-next-")[1] || "";
    if (musicID) {
      const sr = await getSearchResult(prisma, musicID);
      if (sr !== false) {
        addToPlayNext(prisma, sr);
      }
    }
  });

  bot.action(/^(add-to-queue-)/g, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const musicID: string = ctx.match.input.split("add-to-queue-")[1] || "";
    if (musicID) {
      const sr = await getSearchResult(prisma, musicID);
      if (sr !== false) {
        addQueue(prisma, sr);
      }
    }
  });

  bot.launch();

  // Enable graceful stop
  process.once("SIGINT", async () => {
    console.log("SIGINT");
    await browser.close();
    await prisma.$disconnect();
    bot.stop("SIGINT");
  });

  process.once("SIGTERM", async () => {
    console.log("SIGTERM");
    await browser.close();
    await prisma.$disconnect();
    bot.stop("SIGTERM");
  });
})();
