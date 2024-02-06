import puppeteer from "puppeteer-extra";
import { PrismaClient } from "@prisma/client";
import { initCookies } from "./func/cookies";
import Adblocker from "puppeteer-extra-plugin-adblocker";
import { Browser, Page } from "puppeteer";
import { PuppeteerBlocker } from "@cliqz/adblocker-puppeteer";

import { getQueue } from "./repository/queue";

import { Player } from "./events/player";
import { useBot } from "./libs/bot";

(async () => {
  const prisma = new PrismaClient();

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
        "--autoplay-policy=no-user-gesture-required",
      ],
      defaultViewport: null,
    });

  new Player();

  // get pages
  const pages: Page[] = await browser.pages();
  globalThis.playerPage = pages[0];

  PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInPage(playerPage);
  });

  // init cookies
  initCookies();

  // init BOT
  const bot = useBot();
  bot.start((ctx) => ctx.reply("Welcome"));

  // define status player
  globalThis.statusPlay = "idle";

  // get queue if exist
  const [exist, lastQueue] = await getQueue(prisma);
  if (!exist) {
    globalThis.currentQueue = {
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
    globalThis.currentQueue = lastQueue;
  }

  globalThis.currentTitle = null;
  globalThis.newTitle = null;

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
