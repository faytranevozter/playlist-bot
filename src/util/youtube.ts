import getYouTubeID from "get-youtube-id";

export interface YoutubeMeta {
  title: string;
  author_name: string;
  author_url: string;
  type: string;
  height: number;
  width: number;
  version: string;
  provider_name: string;
  provider_url: string;
  thumbnail_height: number;
  thumbnail_width: number;
  thumbnail_url: string;
  html: string;
}

// export type YoutubeMeta as YoutubeMeta

export const getYoutubeMeta = async (url: string): Promise<YoutubeMeta> => {
  const musicID: string | null = getYouTubeID(url);
  const res = await fetch(
    `https://youtube.com/oembed?format=json&url=https://youtube.com/watch?v=${musicID}`,
  );
  const response = await res.json();
  return response;
};

export const convertDuration = (duration: string): number => {
  const split = duration.split(":");
  let durationInsecond: number = 0;
  if (split[2]) {
    durationInsecond += parseInt(split[0]) * 3600;
    durationInsecond += parseInt(split[1]) * 60;
    durationInsecond += parseInt(split[2]);
  } else {
    durationInsecond += parseInt(split[0]) * 60;
    durationInsecond += parseInt(split[1]);
  }

  return durationInsecond;
};

export const getMusicID = (rawURL: string): string => {
  const url = new URL(rawURL);
  const musicID = url.searchParams.get("v");
  return `watch?v=${musicID}`;
};
