import dayjs, { Dayjs } from "dayjs";
import { GetCurrentPlaying, PlayDirectURL } from "./player";
import {
  getQueue,
  updateFinished,
  updateIsPlaying,
  updatePlayedAt,
} from "../repository/queue";
import { getSubscribedList } from "../repository/subscriber";
import { useBot } from "../libs/bot";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LocalMonitor = async () => {
  try {
    if (globalThis.playerPage.isClosed()) {
      clearInterval(globalThis.playerTimer);
    }

    await globalThis.playerPage.waitForSelector(".ytmusic-player-bar .title");
    globalThis.newTitle =
      (await (
        await globalThis.playerPage.$(".ytmusic-player-bar .title")
      )?.evaluate((el) => el.textContent || "")) || "";

    // console.log(`"${globalThis.currentTitle}"=="${globalThis.newTitle}"`);

    if (globalThis.newTitle != globalThis.currentTitle) {
      // on really change
      if (globalThis.currentTitle !== null) {
        // clear interval (stop monitoring)
        clearInterval(globalThis.playerTimer);

        // wait for play mode, make sure is playing
        await globalThis.playerPage.waitForSelector(
          `#play-pause-button[title="Pause"]:not([hidden])`,
        );

        // pause (prevent playing unwanted next song)
        await globalThis.playerPage.click(
          `#play-pause-button[title="Pause"]:not([hidden])`,
        );
        // await globalThis.playerPage.keyboard.press("Space");

        // set finish
        if (
          globalThis.currentQueue.id > 0 &&
          globalThis.currentQueue.finishedAt == null
        ) {
          await updateFinished(prisma, globalThis.currentQueue);
        }

        // check next queue
        const [nextExist, nextQueue] = await getQueue(prisma);
        if (nextExist && nextQueue != null) {
          // set globalThis.currentQueue to nextQueue
          globalThis.currentQueue = nextQueue;

          // update current title (it should the same even the source is different)
          globalThis.currentTitle = nextQueue.title;

          // play current song with refresh
          await PlayCurrentSong(true);
        } else {
          // wait for play mode, make sure is playing
          await globalThis.playerPage.waitForSelector(
            `#play-pause-button[title="Play"]:not([hidden])`,
          );
          // resume
          await globalThis.playerPage.click(
            `#play-pause-button[title="Play"]:not([hidden])`,
          );

          // change current play & globalThis.currentTitle
          globalThis.currentQueue = await GetCurrentPlaying(
            globalThis.playerPage,
          );
          globalThis.currentTitle = globalThis.currentQueue.title;

          // send notification
          sendNotificationCurrentPlaying();

          // monitoring dom (again)
          MonitoringEndSong();
        }
      } else {
        globalThis.currentTitle = globalThis.newTitle;
      }
    }
  } catch (error) {
    console.error("---------------");
    console.error(error);
    console.error("---------------");
  }
};

const subscribersID: string[] = [];
let expiredCache: Dayjs = dayjs();

const bot = useBot();

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

const MonitoringEndSong = () => {
  // reset vote count
  globalThis.votePlayNextCount = 0;
  globalThis.votePlayNextUsers = [];

  // console.log("MonitoringEndSong: monitoring dom");
  if (globalThis.playerTimer != null) {
    clearInterval(globalThis.playerTimer);
  }

  globalThis.playerTimer = setInterval(LocalMonitor, 500);
};

const sendNotificationCurrentPlaying = async () => {
  console.log(
    `PlayCurrentSong Playing ${globalThis.currentQueue.title} by ${globalThis.currentQueue.artist}`,
  );
  await sendMessageToSubscriber(
    `Playing ${globalThis.currentQueue.title} by ${globalThis.currentQueue.artist} [${globalThis.currentQueue.duration}]`,
  );
};

const PlayCurrentSong = async (openWithRefreshPage: boolean) => {
  if (globalThis.playerPage.isClosed()) {
    // open new tab
    globalThis.playerPage = await browsers.newPage();
  }

  // playing song
  if (openWithRefreshPage) {
    // open browser
    await PlayDirectURL(globalThis.playerPage, globalThis.currentQueue);
  }

  // update is playing (global variable)
  statusPlay = "playing";

  // update db
  if (globalThis.currentQueue.id > 0) {
    await updateIsPlaying(prisma, globalThis.currentQueue, true);
    await updatePlayedAt(prisma, globalThis.currentQueue);
  }

  // send notification
  sendNotificationCurrentPlaying();

  // monitoring dom on change song (after song end)
  MonitoringEndSong();
};

export {
  LocalMonitor,
  MonitoringEndSong,
  sendNotificationCurrentPlaying,
  PlayCurrentSong,
};
