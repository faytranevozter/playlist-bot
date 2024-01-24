import { ElementHandle, Page } from "puppeteer";

export const MonitorDOM = async (
  page: Page,
  selector: string,
  callback: (newVal: ElementHandle<Element> | null) => void,
  prevValue: ElementHandle<Element> | null,
) => {
  const newVal = await page.$(selector);
  if (prevValue !== null && newVal !== prevValue) {
    console.log(prevValue, newVal);
    callback(newVal);
    return;
  }

  // add some delay
  await new Promise((_) => setTimeout(_, 500));

  // call recursively
  MonitorDOM(page, selector, callback, newVal);
};

export const MonitorDOMTextContent = async (
  page: Page,
  selector: string,
  callback: (newVal: string | null) => void,
  prevValue: string | null,
) => {
  if (page.isClosed()) {
    callback(null);
    return;
  }

  try {
    await page.waitForSelector(selector, { timeout: 500 });
    const newVal: string | null =
      (await (
        await page.$(selector)
      )?.evaluate((el) => el.textContent || "")) || "";
    if (prevValue !== null && newVal !== prevValue) {
      console.log(prevValue, newVal);
      callback(newVal);
      return;
    }

    // add some delay
    await new Promise((_) => setTimeout(_, 500));

    // call recursively
    MonitorDOMTextContent(page, selector, callback, newVal);
  } catch (error) {
    callback(null);
    return;
  }
};
