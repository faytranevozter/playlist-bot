import dayjs, { Dayjs } from "dayjs";
import { GetCurrentPlaying, PlayDirectURL } from "../player";
import {
  getQueue,
  updateFinished,
  updateIsPlaying,
  updatePlayedAt,
} from "../queue";
import { getSubscribedList } from "../subscriber";
import { useBot } from "../libs/bot";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    playerPage = await browsers.newPage();
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

export {
  LocalMonitor,
  MonitoringEndSong,
  sendNotificationCurrentPlaying,
  PlayCurrentSong,
};
