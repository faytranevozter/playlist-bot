import {
  Prisma,
  PrismaClient,
  Queue,
  SearchResult,
  TelegramUser,
} from "@prisma/client";
import dayjs, { type Dayjs } from "dayjs";

export const addQueue = async (
  prisma: PrismaClient,
  sr: SearchResult,
  user: TelegramUser,
): Promise<{ success: boolean; errorMessage: string; queue: Queue | null }> => {
  const resCount = await prisma.queue.count({
    where: {
      musicID: sr.musicID,
      playedAt: null,
    },
  });

  if (resCount.valueOf() > 0) {
    return {
      success: false,
      errorMessage: "the song already in queue",
      queue: null,
    };
  }

  const queue = await prisma.queue.create({
    data: {
      musicID: sr.musicID,
      title: sr.title,
      artist: sr.artist,
      thumbnail: sr.thumbnail,
      album: sr.album,
      duration: sr.duration,
      duration_second: sr.duration_second,
      total_play: sr.total_play,
      telegramUserID: user.id,
    },
  });

  return {
    success: true,
    errorMessage: "",
    queue: queue,
  };
};

export const addToPlayNext = async (
  prisma: PrismaClient,
  sr: SearchResult,
  user: TelegramUser,
): Promise<{ success: boolean; errorMessage: string; queue: Queue | null }> => {
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

  let createdAt: Dayjs = dayjs();
  if (res) {
    createdAt = dayjs(res.createdAt).subtract(1, "minute");
  }

  const existingQueue = await prisma.queue.findFirst({
    where: {
      musicID: sr.musicID,
      playedAt: null,
    },
  });

  // current music is already on queue, then move to the top
  if (existingQueue) {
    const updatedQueue = await prisma.queue.update({
      where: {
        id: existingQueue.id,
      },
      data: {
        createdAt: createdAt.toDate(),
      },
    });

    return {
      success: true,
      errorMessage: "",
      queue: updatedQueue,
    };
  }

  const queue = await prisma.queue.create({
    data: {
      musicID: sr.musicID,
      title: sr.title,
      artist: sr.artist,
      thumbnail: sr.thumbnail,
      album: sr.album,
      duration: sr.duration,
      duration_second: sr.duration_second,
      total_play: sr.total_play,
      telegramUserID: user.id,
      createdAt: createdAt.toDate(),
    },
  });

  return {
    success: true,
    errorMessage: "",
    queue: queue,
  };
};

export const getQueues = async (
  prisma: PrismaClient,
): Promise<Prisma.QueueGetPayload<{ include: { user: true } }>[]> => {
  const res = await prisma.queue.findMany({
    where: {
      playedAt: null,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
    include: {
      user: true,
    },
  });

  return res;
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
