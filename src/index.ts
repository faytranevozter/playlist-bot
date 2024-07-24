import puppeteer from "puppeteer-extra";
import { PrismaClient } from "@prisma/client";
import { initCookies } from "./func/cookies";
// import Adblocker from "puppeteer-extra-plugin-adblocker";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";

import { getQueue } from "./repository/queue";

import { Player } from "./events/player";
import { useBot } from "./libs/bot";

(async () => {
  const prisma = new PrismaClient();

  const extPath = "./adblockchrome";

  // Launch the browser
  const browser: Browser = await puppeteer
    // .use(
    //   Adblocker({
    //     interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
    //     blockTrackers: true,
    //   }),
    // )
    .use(StealthPlugin())
    .launch({
      headless: true,
      ignoreDefaultArgs: ["--mute-audio"],
      args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
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

  // wait until all tabs open
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // close second tab
  await browser.pages().then((pages) => pages[1].close());

  // get pages
  const pages: Page[] = await browser.pages();
  globalThis.playerPage = pages[0];

  // init cookies
  initCookies();

  // init BOT
  const bot = useBot();
  bot.start((ctx) => ctx.reply("Welcome"));

  bot.telegram.setMyCommands([
    { command: "play", description: "Play a music" },
    { command: "pause", description: "You know this" },
    { command: "vote_next", description: "Voting to play next" },
    { command: "queue", description: "Queue list" },
    { command: "info", description: "Get info current playing" },
    { command: "lyrics", description: "Get lyrics from current playing" },
    { command: "subscribe", description: "Subscribe chat to bot" },
    { command: "unsubscribe", description: "Unsubscribe chat to bot" },
  ]);

  new Player();

  // define status player
  globalThis.votePlayNextUsers = [];
  globalThis.votePlayNextMinimum = 5;
  globalThis.votePlayNextCount = 0;
  globalThis.requestLimitDuration = 90;
  globalThis.requestHistory = {};
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
      telegramUserID: BigInt(0),
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

  bot.launch(
    {
      dropPendingUpdates: true,
    },
    () => {
      console.log("Bot Player Running");
    },
  );

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
