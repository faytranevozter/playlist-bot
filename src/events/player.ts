import { Context } from "telegraf";
import { Action, Command } from "../decorators/bot.decorator";
import { PlayCurrentSong } from "../func/player";
import { PlayFromHome } from "../player";
import { addToPlayNext, getQueues } from "../queue";
import { getSearchResult } from "../search";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class Player {
  @Command("pause")
  async pause(ctx: Context) {
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
  }

  @Command("play")
  async play(ctx: Context) {
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
  }

  @Command("info")
  info(ctx: Context) {
    if (statusPlay !== "playing") {
      ctx.reply("NOTHING PLAYED");
      return;
    }

    ctx.reply(`Now playing ${currentQueue.title} by ${currentQueue.artist}`);
  }

  @Command("trending")
  trending(ctx: Context) {
    PlayFromHome(playerPage, "TRENDING");
    ctx.reply("Playing from trending");
  }

  @Command("quick_pick")
  quickPick(ctx: Context) {
    ctx.reply("Playing from quick pick");
    PlayFromHome(playerPage, "QUICK_PICK");
  }

  @Command("queue")
  async queue(ctx: Context) {
    const queues = await getQueues(prisma);
    if (queues.length > 0) {
      ctx;
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
  }

  @Action(/^(add-to-queue-)/g)
  async playNext(ctx: Context & { match: { input: string } }) {
    await ctx.answerCbQuery();

    await ctx.editMessageReplyMarkup(undefined);

    const musicID: string = ctx.match.input.split("play-this-next-")[1] || "";
    if (musicID) {
      const sr = await getSearchResult(prisma, musicID);
      if (sr !== false) {
        addToPlayNext(prisma, sr);
      }
    }
  }

  @Command("hehe")
  hehe(ctx: Context) {
    console.log("test");
    ctx.reply("test");
  }
}
