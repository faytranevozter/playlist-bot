import { Page } from "puppeteer";
import fs from "fs";
import { cookiePath } from "../config/config";

export const initCookies = () => {
  if (!fs.existsSync(cookiePath)) {
    fs.writeFileSync(cookiePath, JSON.stringify([]));
  }
};

export const saveCookies = async (page: Page) => {
  const cookies = await page.cookies();
  fs.writeFileSync(cookiePath, JSON.stringify(cookies));
};

export const loadCookies = async (page: Page) => {
  const cookies = JSON.parse(fs.readFileSync(cookiePath).toString());
  await page.setCookie(...cookies);
};

export const getCookies = () => {
  return fs.readFileSync(cookiePath).toString();
};
