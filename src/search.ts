import { Prisma, PrismaClient, SearchResult } from "@prisma/client";
import { Page } from "puppeteer";
import {
  SearchSong,
  convertDuration,
  convertVideoIDtoMusicID,
  formatDuration,
} from "./util/youtube";

export interface SearchResultWeb {
  musicID: string;
  title: string;
  artist: string;
  thumbnail: string;
  album?: string;
  duration: string;
  total_play: string;
}

export const SearchWordApi = async (
  query: string,
): Promise<SearchResultWeb[]> => {
  const res = await SearchSong(query);

  return res.map((row): SearchResultWeb => {
    return {
      musicID: convertVideoIDtoMusicID(row.videoId),
      title: row.name || "",
      thumbnail: row.thumbnails[0].url || "",
      artist: row.artist.name,
      album: row.album?.name,
      duration: formatDuration(row.duration || 0),
      total_play: "",
    };
  });
};

export const SearchWord = async (
  page: Page,
  query: string,
): Promise<SearchResultWeb[]> => {
  // console.log("Searching", page.url());

  if (page.url() == "about:blank") {
    await page.goto(`https://music.youtube.com/search?q=${query}`);
  } else {
    // search
    const inputValue: string = await page.$eval(
      "#input.ytmusic-search-box",
      (el) => (el as HTMLInputElement).value || "",
    );
    // focus on the input field
    await page.focus("#input.ytmusic-search-box");
    for (let i = 0; i < inputValue.length; i++) {
      await page.keyboard.press("Backspace");
    }
    await page.type("#input.ytmusic-search-box", query);
    await page.keyboard.press("Enter");
    // await page.click("tp-yt-paper-item:first-child");
  }

  // song only
  await page.waitForSelector(
    `.ytmusic-chip-cloud-chip-renderer a[title="Show song results"]`,
  );
  await page.click(
    `.ytmusic-chip-cloud-chip-renderer a[title="Show song results"]`,
  );

  const results: SearchResultWeb[] = [];

  // const topResult: SearchResult = {};

  // // top result
  // const topResultTitle = await page.waitForSelector(
  //   "#contents ytmusic-card-shelf-renderer .metadata-container .title",
  // );
  // if (topResultTitle) {
  //   const topTitle = await topResultTitle.evaluate((el) => el.textContent);
  // }
  // const topResultImg = await page.waitForSelector(
  //   "#contents ytmusic-card-shelf-renderer .main-card-content-container #img",
  // );
  // if (topResultImg) {
  //   const topImage = await topResultImg.evaluate((el) => el.getAttribute("src"));
  // }

  const resultSongs = await page.waitForSelector(
    // "#contents.ytmusic-shelf-renderer",
    // "#contents.ytmusic-shelf-renderer > ytmusic-responsive-list-item-renderer",
    "#contents.ytmusic-section-list-renderer ytmusic-responsive-list-item-renderer.ytmusic-shelf-renderer",
  );
  if (resultSongs) {
    const totalSong = (
      await page.$$(
        "#contents.ytmusic-shelf-renderer > ytmusic-responsive-list-item-renderer",
      )
    ).length;

    // limit result to 3
    const maxResult = totalSong > 3 ? 3 : totalSong;

    for (let i = 1; i <= totalSong; i++) {
      if (results.length == maxResult) {
        break;
      }

      const musicID = await (
        await page.waitForSelector(
          `#contents.ytmusic-shelf-renderer > ytmusic-responsive-list-item-renderer:nth-child(${i}) .title a`,
        )
      )?.evaluate((el) => el.getAttribute("href"));
      const title = await (
        await page.waitForSelector(
          `#contents.ytmusic-shelf-renderer > ytmusic-responsive-list-item-renderer:nth-child(${i}) .title`,
        )
      )?.evaluate((el) => el.textContent);
      const img = await (
        await page.waitForSelector(
          `#contents.ytmusic-shelf-renderer > ytmusic-responsive-list-item-renderer:nth-child(${i}) #img`,
        )
      )?.evaluate((el) => el.getAttribute("src"));
      const meta = await (
        await page.waitForSelector(
          `#contents.ytmusic-shelf-renderer > ytmusic-responsive-list-item-renderer:nth-child(${i}) .secondary-flex-columns .complex-string`,
        )
      )?.evaluate((el) => el.textContent);

      const metaPlay = await (
        await page.waitForSelector(
          `#contents.ytmusic-shelf-renderer > ytmusic-responsive-list-item-renderer:nth-child(${i}) .secondary-flex-columns yt-formatted-string:nth-child(2)`,
        )
      )?.evaluate((el) => el.getAttribute("title"));

      // check duplicate
      if (results.find((row) => row.musicID == musicID)) {
        continue; // skip
      }

      results.push({
        musicID: musicID || "",
        title: title || "",
        thumbnail: img || "",
        artist: (meta || "").split("•")[0].trim(),
        album: (meta || "").split("•")[1].trim(),
        duration: (meta || "").split("•")[2].trim(),
        total_play: metaPlay || "",
      });
    }

    // console.log(results);
  }

  return results;
};

export const addSearchResults = async (
  prisma: PrismaClient,
  searchResults: SearchResultWeb[],
): Promise<void> => {
  for (let i = 0; i < searchResults.length; i++) {
    const sr = searchResults[i] as Prisma.SearchResultCreateInput;
    try {
      // console.log("musicID", sr);
      await prisma.searchResult.create({
        data: {
          musicID: sr.musicID,
          title: sr.title,
          artist: sr.artist,
          thumbnail: sr.thumbnail,
          album: sr.album,
          duration: sr.duration,
          duration_second: convertDuration(sr.duration),
          total_play: sr.total_play,
        },
      });
    } catch (err) {
      console.error("failed to insert search result:", err.message);
    }
  }
};

export const getSearchResult = async (
  prisma: PrismaClient,
  musicID: string,
): Promise<false | SearchResult> => {
  const res = await prisma.searchResult.findFirst({
    where: {
      musicID,
    },
  });

  if (!res) {
    return false;
  }

  return res;
};
