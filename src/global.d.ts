/* eslint-disable no-var */
import { Queue } from "@prisma/client";
import { Dayjs } from "dayjs";
import { Browser, Page } from "puppeteer";
import { Telegraf } from "telegraf";
export {};

export type RequestHistory = {
  lastRequest: Dayjs;
  suspendUntil: Dayjs;
  histories: Queue[];
};

declare global {
  var playerPage: Page;
  var statusPlay: "playing" | "paused" | "idle";
  var currentQueue: Queue;
  var browsers: Browser;
  var bot: Telegraf;
  var playerTimer: NodeJS.Timeout;
  var currentTitle: string | null;
  var newTitle: string | null;
  var timer: NodeJS.Timeout;
  var votePlayNextUsers: number[];
  var votePlayNextMinimum: number;
  var votePlayNextCount: number;
  var requestLimitDuration: number;
  var requestHistory: Record<number, RequestHistory>;
}
