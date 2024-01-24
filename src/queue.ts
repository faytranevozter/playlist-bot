import { PrismaClient, Queue, SearchResult } from "@prisma/client";
// import getYouTubeID from "get-youtube-id";
// import { YoutubeMeta, getYoutubeMeta } from "./util/youtube";

export const addQueue = async (
  prisma: PrismaClient,
  sr: SearchResult,
): Promise<[boolean, string]> => {
  // const meta: YoutubeMeta = await getYoutubeMeta(url);
  // const musicID: string | null = getYouTubeID(url);

  const resCount = await prisma.queue.count({
    where: {
      musicID: sr.musicID,
      finishedAt: {
        not: null,
      },
    },
  });

  if (resCount.valueOf() > 0) {
    return [false, "the song already in queue"];
  }

  await prisma.queue.create({
    data: {
      musicID: sr.musicID,
      title: sr.title,
      artist: sr.artist,
      thumbnail: sr.thumbnail,
      album: sr.album,
      duration: sr.duration,
      duration_second: sr.duration_second,
      total_play: sr.total_play,
    },
  });

  return [true, ""];
};

export const playNext = async (
  prisma: PrismaClient,
  sr: SearchResult,
): Promise<[boolean, string]> => {
  // const meta: YoutubeMeta = await getYoutubeMeta(url);
  // const musicID: string | null = getYouTubeID(url);

  const res = await prisma.queue.findFirst({
    where: {
      musicID: sr.musicID,
      finishedAt: {
        not: null,
      },
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  });

  const createdAt: Date = new Date();
  if (res) {
    createdAt.setSeconds(res.createdAt.getMinutes() - 1);
  }

  await prisma.queue.create({
    data: {
      musicID: sr.musicID,
      title: sr.title,
      artist: sr.artist,
      thumbnail: sr.thumbnail,
      album: sr.album,
      duration: sr.duration,
      duration_second: sr.duration_second,
      total_play: sr.total_play,
      createdAt,
    },
  });

  return [true, ""];
};

export const getQueue = async (
  prisma: PrismaClient,
): Promise<[boolean, Queue | null]> => {
  const res = await prisma.queue.findFirst({
    where: {
      playedAt: null,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  });

  if (!res) {
    return [false, null];
  }

  return [true, res];
};

export const getNext = async (
  prisma: PrismaClient,
): Promise<boolean | Queue> => {
  const res = await prisma.queue.findFirst({
    where: {
      playedAt: null,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  });

  if (!res) {
    return false;
  }

  return res;
};

export const updatePlayedAt = async (
  prisma: PrismaClient,
  queue: Queue,
): Promise<void> => {
  await prisma.queue.update({
    where: {
      id: queue.id,
    },
    data: {
      playedAt: new Date(),
    },
  });
};

export const updateIsPlaying = async (
  prisma: PrismaClient,
  queue: Queue,
  playing: boolean,
): Promise<void> => {
  await prisma.queue.update({
    where: {
      id: queue.id,
    },
    data: {
      isPlaying: playing,
    },
  });
};

export const updateFinished = async (
  prisma: PrismaClient,
  queue: Queue,
): Promise<void> => {
  await prisma.queue.update({
    where: {
      id: queue.id,
    },
    data: {
      isPlaying: false,
      finishedAt: new Date(),
    },
  });
};
