import { Page } from "puppeteer";
import { loadCookies, saveCookies } from "./cookies";
import { Queue } from "@prisma/client";
import { convertDuration, getMusicID } from "./util/youtube";

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

export const Play = async (page: Page, queue: Queue) => {
  // load cookies
  await loadCookies(page);

  // Go to your site
  await page.goto(`https://music.youtube.com/${queue.musicID}`);
  // console.log('Playing music');

  // await page.evaluate(function() {
  //   const progress = document.querySelector("#progress-bar");
  //   setInterval(() => {
  //     state.time = parseInt(progress?.ariaValueNow || "");
  //     state.duration = parseInt(progress?.ariaValueMax || "");
  //     console.log(progress?.ariaValueNow, progress?.ariaValueMax);
  //   }, 1000);
  // });

  // new Promise((r) => setTimeout(r, 5000));
  // await page.waitForNetworkIdle();

  console.log("after waitfornetworkidle");
  await page.waitForSelector(".ytmusic-player-bar .title");
  // const thumbnail = await page.$eval(
  //   ".ytmusic-player-bar .title",
  //   (el) => el.textContent || "",
  // );
  // console.log("thumbnail", thumbnail);
  // await page.waitForNavigation({
  //   waitUntil: "networkidle0",
  // });

  // state.duration = await page.$eval("#progress-bar", (el) =>
  //   parseInt(el?.ariaValueMax || ""),
  // );

  // console.log(state);

  // save
  await saveCookies(page);

  // await page.click('div#header a.yt-simple-endpoint.style-scope.ytmusic-chip-cloud-chip-renderer[title="Show song results"]');
  // await page.focus('div#search-input.ytd-searchbox-spt');
  // await page.type('div#search-input.ytd-searchbox-spt', input);
  // await page.keyboard.press('Enter');
  // await page.waitForTimeout('2000');
  // await page.click('a#video-title.yt-simple-endpoint.style-scope.ytd-video-renderer');
};

export const PlayFromHome = async (page: Page, part: keyof Homepage) => {
  // load cookies
  await loadCookies(page);

  console.log("url", page.url());

  if (page.url() == "about:blank") {
    await page.goto("https://music.youtube.com/");
  } else {
    // click home
    await page.click("tp-yt-paper-item:first-child");
  }

  // Go to your site
  // console.log('Playing music');

  await page.waitForNetworkIdle();
  // await page.waitForNavigation({
  //   waitUntil: "domcontentloaded",
  // });

  console.log("url", page.url());
  try {
    await page.click(
      `#contents #items:nth-child(-n + ${mapHomepage[part] + 1}) #play-button:first-child`,
    );
  } catch (error) {
    console.error("something went wrong when playing music");
  }

  // await page.evaluate((index) => {
  //   window.addEventListener("load", (e) => {
  //     document
  //       .querySelectorAll("#contents #items")
  //       [index].querySelectorAll("#play-button")[0]
  //       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //       // @ts-ignore
  //       .click();
  //   });
  // }, mapHomepage[part]);

  // save
  await saveCookies(page);
};

export const Pause = async (page) => {
  await page.keyboard.press("Space");
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
