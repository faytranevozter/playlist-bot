import { Page } from "puppeteer";
import { loadCookies, saveCookies } from "./cookies";
import { Queue } from "@prisma/client";
import { convertDuration, getMusicID } from "../util/youtube";

export interface PlayerState {
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  is_playing: boolean;
  time: number;
  duration: number;
}

interface Homepage {
  QUICK_PICK: number;
  TRENDING: number;
}

const mapHomepage: Homepage = {
  QUICK_PICK: 0,
  TRENDING: 8,
};

export const PlayDirectURL = async (page: Page, queue: Queue) => {
  // load cookies
  await loadCookies(page);

  // go to page
  await page.goto(`https://music.youtube.com/${queue.musicID}`);

  // stupid case: wait for playing
  await page.waitForSelector(".ytmusic-player-bar .title");

  // save
  await saveCookies(page);
};

export const PlayFromHome = async (page: Page, part: keyof Homepage) => {
  // load cookies
  await loadCookies(page);

  if (page.url() == "about:blank") {
    await page.goto("https://music.youtube.com/");
  } else {
    // click home
    await page.click("tp-yt-paper-item:first-child");
  }

  try {
    await page.waitForSelector(
      `#contents #items:nth-child(-n + ${mapHomepage[part] + 1}) #play-button:first-child`,
    );

    await page.click(
      `#contents #items:nth-child(-n + ${mapHomepage[part] + 1}) #play-button:first-child`,
    );
  } catch (error) {
    console.error("something went wrong when playing music");
  }

  // save
  await saveCookies(page);
};

export const GetCurrentPlaying = async (page: Page): Promise<Queue> => {
  await page.waitForSelector(".ytmusic-player-bar .title");

  const title = await page.$eval(
    ".ytmusic-player-bar .title",
    (el) => el.textContent || "",
  );

  const thumbnail = await page.$eval(
    ".thumbnail-image-wrapper.ytmusic-player-bar img",
    (el) => el.getAttribute("src") || "",
  );

  await page.waitForSelector(".ytmusic-player-bar .byline");
  const meta = await page.$eval(
    ".ytmusic-player-bar .byline",
    (el) => el.getAttribute("title") || "",
  );

  const duration = await page.$eval(
    "#progress-bar",
    (el) => (el as HTMLProgressElement).ariaValueMax || "",
  );

  const url = await page.$eval(
    `[data-sessionlink="feature=player-title"]`,
    (el) => el.getAttribute("href") || "",
  );

  return {
    id: -1,
    musicID: getMusicID(url),
    title,
    artist: (meta || "").split("•")[0].trim(),
    album: (meta || "").split("•")[1].trim(),
    year: (meta || "").split("•")[2].trim(),
    thumbnail,
    duration,
    duration_second: convertDuration(duration),
    total_play: "",
    isPlaying: false,
    playedAt: null,
    finishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
