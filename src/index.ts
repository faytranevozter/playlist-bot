// import { Browser } from "puppeteer";
// import "dotenv/config";
// import { Browser, Page } from "puppeteer-core";
import puppeteer from "puppeteer-extra";
// import search from "./search";
import { GetCurrentPlaying, PlayDirectURL, PlayFromHome } from "./player";
// const puppeteer = require('puppeteer-core');
import { Markup, Telegraf } from "telegraf";
// import YTMusic from "ytmusic-api";

import { PrismaClient, Queue } from "@prisma/client";
// import { addQueue } from "./queue";
// import { YoutubeMeta, getYoutubeMeta } from "./util/youtube";
import { initCookies } from "./cookies";

// const StealthPlugin = require('puppeteer-extra-plugin-stealth')
// import StealthPlugin from "puppeteer-extra-plugin-stealth";
import Adblocker from "puppeteer-extra-plugin-adblocker";

import { Browser, Page } from "puppeteer";

// import { getQueue } from "./queue";
import { botToken } from "./config";
import { PuppeteerBlocker } from "@cliqz/adblocker-puppeteer";
import {
  SearchResultWeb,
  SearchWord,
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
// import { MonitorDOMTextContent } from "./page";
// puppeteer.use(StealthPlugin())

(async () => {
  // const xbot = new Telegraf(botToken);
  // xbot.start((ctx) => ctx.reply("Welcome"));
  // // xbot.help((ctx) => ctx.reply('Send me a sticker'))
  // // xbot.on(message('sticker'), (ctx) => ctx.reply('👍'))
  // // xbot.hears('hi', (ctx) => ctx.reply('Hey there'))

  // xbot.on("inline_query", async (ctx) => {
  //   // const result = [];
  //   // Explicit usage

  //   // console.log(ctx.inlineQuery);
  //   const id = new Date().getTime().toString();
  //   console.log(id);

  //   // await ctx.telegram.answerInlineQuery(ctx.inlineQuery.id, result)

  //   // Using context shortcut
  //   return await ctx.answerInlineQuery([
  //     {
  //       id,
  //       type: "article",
  //       title: "Payung Teduh",
  //       description: "ini apa ya?",
  //       thumbnail_url: "https://placekitten.com/200/300",
  //       // reply_markup: {
  //       //   inline_keyboard: reply,
  //       // },
  //       input_message_content: {
  //         message_text: "Payung",
  //         // parse_mode: "MarkdownV2",
  //         // description: "description here",
  //       },
  //       ...Markup.inlineKeyboard([
  //         [Markup.button.callback("Play Next", "play-next-x")],
  //         [Markup.button.callback("Add to Queue", JSON.stringify({ a: "c" }))],
  //       ]),
  //     },
  //   ]);
  // });

  // xbot.action(/^(play-next-)/g, async (ctx) => {
  //   console.log(ctx);
  //   await ctx.answerCbQuery();
  //   await ctx.editMessageReplyMarkup(undefined);
  // });

  // // auto play
  // // xbot.on("chosen_inline_result", ({ chosenInlineResult }) => {
  // //   console.log("chosen inline result", chosenInlineResult);
  // // });

  // xbot.launch();

  // return;

  // const ytmusic = new YTMusic()
  // await ytmusic.initalize()
  // ytmusic.
  // return
  const prisma = new PrismaClient();

  // replace topic
  // const url: string = 'https://music.youtube.com/watch?v=bl6SDqjSpMI'
  // addQueue(prisma, url)
  // addQueue(prisma, 'https://music.youtube.com/watch?v=KWLGyeg74es&si=LJgQf_wRd8x-JVZ9', 'Owl city')
  // return

  // Launch the browser
  const browser: Browser = await puppeteer
    .use(Adblocker({ blockTrackers: true }))
    // .use(StealthPlugin())
    .launch({
      headless: false,
      // headless: "new",
      ignoreDefaultArgs: ["--mute-audio"],
      args: [
        '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:86.0) Gecko/20100101 Firefox/86.0"',
        // '--use-gl=egl', // linux headless
        "--autoplay-policy=no-user-gesture-required",
        // "--start-maximized",
        // "--start-fullscreen",
      ],
      defaultViewport: null,
      // executablePath: '/Applications/Google Chrome.app/',
      // executablePath:
      // "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });

  // blocker extension
  // const blocker = await PuppeteerBlocker.fromLists(fetch, [
  //   "https://easylist.to/easylist/easylist.txt",
  // ]);

  // Create a page
  // const page = await browser.newPage();
  const pages: Page[] = await browser.pages();
  let playerPage: Page = pages[0];

  PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInPage(playerPage);
  });
  // await blocker.enableBlockingInPage(playerPage);

  // let isPlaying: boolean = false;

  // init cookies
  initCookies();

  // const playerState: PlayerState = {
  //   title: "Testing",
  //   author: "author",
  //   thumbnail: "thumbnail",
  //   url: "url",
  //   is_playing: false,
  //   time: 0,
  //   duration: 0,
  // };

  // const searchPage: Page = await browser.newPage();
  // search(searchPage, 'hijau+daun')
  // player(playerPage, 'https://music.youtube.com/watch?v=bl6SDqjSpMI')

  // await page.setViewport();

  // search

  // Close browser.
  // await browser.close();

  const bot = new Telegraf(botToken);
  bot.start((ctx) => ctx.reply("Welcome"));
  // bot.help((ctx) => ctx.reply('Send me a sticker'))
  // bot.on(message('sticker'), (ctx) => ctx.reply('👍'))
  // bot.hears('hi', (ctx) => ctx.reply('Hey there'))

  // bot.command("info", (ctx) => {
  //   ctx.reply(JSON.stringify(lastQueue, null, 2));
  // });

  // bot.command("queue", (ctx) => {
  //   const message = ctx.message.text.replace(/queue/, "asd");
  //   ctx.reply(message);
  // });

  let statusPlay: "playing" | "paused" | "idle" = "idle";
  let currentQueue: Queue;
  // let isWatchingDOM: boolean = false;
  // eslint-disable-next-line prefer-const
  let [exist, lastQueue] = await getQueue(prisma);
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

  const sendMessage = async (message) => {
    return bot.telegram.sendMessage(233041497, message);
  };

  let playerTimer: NodeJS.Timeout;

  let currentTitle: string | null = null;
  let newTitle: string | null = null;
  const LocalMonitor = async () => {
    try {
      // console.log("LocalMonitor: checking");
      if (playerPage.isClosed()) {
        clearInterval(playerTimer);
      }

      await playerPage.waitForSelector(".ytmusic-player-bar .title");
      newTitle =
        (await (
          await playerPage.$(".ytmusic-player-bar .title")
        )?.evaluate((el) => el.textContent || "")) || "";
      // console.log("LocalMonitor: currentTitle", currentTitle);
      // console.log("LocalMonitor: newTitle", newTitle);
      console.log(`"${currentTitle}"=="${newTitle}"`);
      if (newTitle != currentTitle) {
        // await
        console.log(`"${currentTitle}"=="${newTitle}"`);
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
            // resume
            // wait for play mode, make sure is playing
            await playerPage.waitForSelector(
              `#play-pause-button[title="Play"]:not([hidden])`,
            );
            await playerPage.click(
              `#play-pause-button[title="Play"]:not([hidden])`,
            );

            // change current play & currentTitle
            currentQueue = await GetCurrentPlaying(playerPage);
            currentTitle = currentQueue.title;

            // send notification
            sendNotificationCurrentPlaying();

            // monitoring dom
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

  const PlayAutoNextSong = async () => {
    console.log("PlayAutoNextSong: no next queue -> playing auto");

    // change current play
    currentQueue = await GetCurrentPlaying(playerPage);

    // resume
    // await playerPage.keyboard.press("Space");
    await PlayCurrentSong(false);
  };

  const PlayNextSong = async () => {
    // set finish
    if (currentQueue.id > 0 && currentQueue.finishedAt == null) {
      await updateFinished(prisma, currentQueue);
    }

    // pause
    // await playerPage.keyboard.press("Space");

    console.log("PlayNextSong: get next queue");
    // get next queue
    const [nextExist, nextQueue] = await getQueue(prisma);
    if (nextExist && nextQueue !== null) {
      console.log("PlayNextSong: next queue exist");
      // close tab
      await playerPage.close();

      // not watching anymore
      // isWatchingDOM = false;

      // update status play
      statusPlay = "idle";

      // assign current queue
      currentQueue = nextQueue;

      // running
      await PlayCurrentSong(true);
    } else {
      console.log("PlayNextSong: no next queue -> playing auto");

      // change current play
      currentQueue = await GetCurrentPlaying(playerPage);

      // resume
      // await playerPage.keyboard.press("Space");
      await PlayCurrentSong(false);
    }
  };

  const MonitoringEndSong = () => {
    console.log("MonitoringEndSong: monitoring dom");
    if (playerTimer != null) {
      clearInterval(playerTimer);
    }

    playerTimer = setInterval(LocalMonitor, 500);
  };

  const sendNotificationCurrentPlaying = async () => {
    console.log(
      `PlayCurrentSong Playing ${currentQueue.title} by ${currentQueue.artist}`,
    );
    await sendMessage(
      `Playing ${currentQueue.title} by ${currentQueue.artist}`,
    );
  };

  const PlayCurrentSong = async (openWithRefreshPage: boolean) => {
    console.log("PlayCurrentSong");

    // console.log("playerPage.isClosed()", playerPage.isClosed());
    if (playerPage.isClosed()) {
      console.log("PlayCurrentSong open new tab");
      playerPage = await browser.newPage();
    }

    // playing song
    if (openWithRefreshPage) {
      console.log("PlayCurrentSong open browser");
      await PlayDirectURL(playerPage, currentQueue);
      console.log("PlayCurrentSong after open browser");
    }

    // update is playing (global variable)
    statusPlay = "playing";

    // update db
    if (currentQueue.id > 0) {
      await updateIsPlaying(prisma, currentQueue, true);
      await updatePlayedAt(prisma, currentQueue);
    }

    sendNotificationCurrentPlaying();
    // await ctx.reply(`Playing ${currentQueue.title} by ${currentQueue.artist}`);

    // on ending music
    MonitoringEndSong();
    // console.log("PlayQueue: monitoring dom");
    // if (playerTimer != null) {
    //   clearInterval(playerTimer);
    // }

    // playerTimer = setInterval(LocalMonitor, 500);
    // if (!isWatchingDOM) {
    //   isWatchingDOM = true;
    // await playerPage.waitForSelector(".ytmusic-player-bar .title");
    // await MonitorDOMTextContent(
    //   playerPage,
    //   // ".thumbnail-image-wrapper.ytmusic-player-bar img",
    //   ".ytmusic-player-bar .title",
    //   async (newTitle) => {
    //     if (playerPage.isClosed()) {
    //       return;
    //     }

    //     console.log("MonitorDOMTextContent: change!!!!");

    //     // const newSong = await newElement?.evaluate((e) => e.textContent);
    //     console.log("MonitorDOMTextContent: newTitle", newTitle);

    //     console.log("MonitorDOMTextContent: end duration");
    //     // set finish
    //     if (currentQueue.id > 0) {
    //       await updateFinished(prisma, currentQueue);
    //     }

    //     // pause
    //     // await playerPage.keyboard.press("Space");

    //     console.log("MonitorDOMTextContent: get next queue");
    //     // get next queue
    //     const [nextExist, nextQueue] = await getQueue(prisma);
    //     if (nextExist && nextQueue !== null) {
    //       console.log("MonitorDOMTextContent: next queue exist");
    //       // not watching anymore
    //       isWatchingDOM = false;

    //       // update status play
    //       statusPlay = "idle";

    //       // assign current queue
    //       currentQueue = nextQueue;

    //       if (!playerPage.isClosed()) {
    //         // close tab
    //         await playerPage.close();
    //       }

    //       // running
    //       await PlayCurrentSong(true);
    //     } else {
    //       console.log("MonitorDOMTextContent: no next queue -> playing auto");

    //       // change current play
    //       currentQueue = await GetCurrentPlaying(playerPage);

    //       // resume
    //       // await playerPage.keyboard.press("Space");
    //       await PlayCurrentSong(false);
    //     }
    //   },
    //   null,
    // );
    // }
  };

  // let playerTimer: NodeJS.Timeout;
  bot.command("play", async (ctx) => {
    console.log("/play");
    // return;
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
    console.log("/pause");
    // return;
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
    console.log("/next");
    // return;
    if (statusPlay !== "playing") {
      ctx.reply("NOTHING PLAYED");
      return;
    }

    // get next queue
    const [nextExist, nextQueue] = await getQueue(prisma);
    if (nextExist && nextQueue !== null) {
      console.log("Next: next queue exist");
      // always clear interval
      clearInterval(playerTimer);

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
      console.log("Next: no next queue -> playing auto");

      // click next song
      await playerPage.click(`.ytmusic-player-bar[title="Next"]`);
    }

    // ctx.reply(`Now playing ${currentQueue.title} by ${currentQueue.artist}`);
  });

  bot.command("quick_pick", async (ctx) => {
    PlayFromHome(playerPage, "QUICK_PICK");
    ctx.reply("Playing from quick pick");
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

  // let isSeaching: boolean = false;
  let timer: NodeJS.Timeout | null = null;
  bot.on("inline_query", async (ctx) => {
    // const result = [];
    // Explicit usage

    // console.log("inline hit", ctx.inlineQuery.query);

    if (ctx.inlineQuery.query == "") {
      return;
    }

    // if (isSeaching) {
    //   return;
    // }

    // while (isSeaching) {
    //   // do nothing
    // }

    // isSeaching = true;

    if (timer != null) {
      clearTimeout(timer);
    }

    timer = setTimeout(async () => {
      console.log("real searching");

      const searchPage: Page = await browser.newPage();

      // search data
      const searchResults = await SearchWord(searchPage, ctx.inlineQuery.query);

      // close tab
      await searchPage.close();

      // save result
      addSearchResults(prisma, searchResults);

      // console.log(ctx.inlineQuery);
      // const id = new Date().getTime().toString();
      // console.log(id);

      // await ctx.telegram.answerInlineQuery(ctx.inlineQuery.id, result)

      // Using context shortcut
      await ctx.answerInlineQuery(
        searchResults.map(
          (row: SearchResultWeb): InlineQueryResult => ({
            id: `${row.musicID}`,
            type: "article",
            title: row.title,
            description: `${row.artist} • ${row.album} • ${row.duration} • ${row.total_play}`,
            thumbnail_url: row.thumbnail,
            input_message_content: {
              photo_url: row.thumbnail,
              message_text: `${row.title} • ${row.artist} • ${row.album} • ${row.duration}`,
            },
            ...Markup.inlineKeyboard([
              [Markup.button.callback("Play Next", `play-next-${row.musicID}`)],
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

      // enable search
      // isSeaching = false;
    }, 1500);
  });

  bot.action(/^(play-next-)/g, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const musicID: string = ctx.match.input.split("play-next-")[1] || "";
    // console.log("musicID", musicID);
    if (musicID) {
      const sr = await getSearchResult(prisma, musicID);
      // console.log("sr", sr);
      if (sr !== false) {
        addToPlayNext(prisma, sr);
      }
    }
  });

  bot.action(/^(add-to-queue-)/g, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const musicID: string = ctx.match.input.split("add-to-queue-")[1] || "";
    // console.log("add-to-queue-", musicID);
    if (musicID) {
      const sr = await getSearchResult(prisma, musicID);
      // console.log("sr", sr);
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
