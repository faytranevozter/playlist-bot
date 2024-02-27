import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

export const cookiePath: string = process.env.COOKIES_PATH || "./cookie.json";

export const botToken: string = process.env.TELEGRAM_BOT_TOKEN || "";
