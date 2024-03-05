import { Queue } from "@prisma/client";
import { RequestHistory } from "../global";
import dayjs from "dayjs";

export const addToHistory = (userID: number, queue: Queue) => {
  const now = dayjs();
  const suspendUntil = dayjs().add(globalThis.requestLimitDuration, "seconds");
  if (!globalThis.requestHistory[userID]) {
    globalThis.requestHistory[userID] = {
      lastRequest: now,
      suspendUntil: suspendUntil,
      histories: [],
    };
  } else {
    globalThis.requestHistory[userID].lastRequest = now;
    globalThis.requestHistory[userID].suspendUntil = suspendUntil;
  }

  globalThis.requestHistory[userID].histories.push(queue);

  // trim history
  if (globalThis.requestHistory[userID].histories.length > 10) {
    globalThis.requestHistory[userID].histories.shift();
  }
};

export const getHistory = (userID: number): RequestHistory | null => {
  return globalThis.requestHistory[userID];
};
