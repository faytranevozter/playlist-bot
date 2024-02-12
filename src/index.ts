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
        "--autoplay-policy=user-gesture-required",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-domain-reliability",
        "--disable-extensions",
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",
        "--disable-notifications",
        "--disable-offer-store-unmasked-wallet-cards",
        "--disable-popup-blocking",
        "--disable-print-preview",
        "--disable-prompt-on-repost",
        "--disable-renderer-backgrounding",
        "--disable-setuid-sandbox",
        "--disable-speech-api",
        "--disable-sync",
        "--hide-scrollbars",
        "--ignore-gpu-blacklist",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-first-run",
        "--no-pings",
        "--no-sandbox",
        "--no-zygote",
        "--password-store=basic",
        "--use-gl=swiftshader",
        "--use-mock-keychain",
      ],
      defaultViewport: null,
    });

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

  bot.telegram.setMyCommands([
    { command: "play", description: "Play a music" },
    { command: "pause", description: "You know this" },
    { command: "queue", description: "Queue list" },
    { command: "info", description: "Get info current playing" },
    { command: "lyrics", description: "Get lyrics from current playing" },
    { command: "subscribe", description: "Subscribe chat to bot" },
    { command: "unsubscribe", description: "Unsubscribe chat to bot" },
  ]);

  new Player();

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
