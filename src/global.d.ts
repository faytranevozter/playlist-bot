/* eslint-disable no-var */
import { Queue } from "@prisma/client";
import { Browser, Page } from "puppeteer";
import { Telegraf } from "telegraf";
export {};
declare global {
  var playerPage: Page;
  var statusPlay: "playing" | "paused" | "idle";
  var currentQueue: Queue;
  var browsers: Browser;
  var bot: Telegraf;
}
