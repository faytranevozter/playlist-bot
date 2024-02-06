import { Telegraf } from "telegraf";
import { botToken } from "../config/config";

export function useBot(): Telegraf {
  if (globalThis.bot !== undefined) return globalThis.bot;
  // eslint-disable-next-line no-var
  var bot = new Telegraf(botToken);
  globalThis.bot = bot;
  return globalThis.bot;
}
