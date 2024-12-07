//src/utils/selenium.js
import request from "request";
import {
  BINARY_LOCATION,
  SELENIUM_CACHE_PATH,
  SELENIUM_EXTENSION_PATH,
  SELENIUM_SNAPSHOT_PATH,
} from "../config/network.js";
import fs, { mkdirSync } from "fs";
import crypto from "crypto";
import { newSemaphore } from "./semaphore.js";
import { getPlatform } from "./platform.js";
import extract from "extract-zip";
import { dirname, join, resolve } from "path";
import { DownloaderHelper } from "node-downloader-helper";
import { isElectronApp } from "./electron.js";
import { sleep } from "./helper.js";

const CHROME_HEADLESS_BIN = false;
const { exec: chromeDriverExec } = newSemaphore();
const CHROME_DRIVER_VERSION = "131.0.6778.109"; // 123.0.6312.58
const CHROME_DRIVER_DOWNLOAD_URL = `https://storage.googleapis.com/chrome-for-testing-public/${CHROME_DRIVER_VERSION}`;
const CHROME_DRIVER_PLATFORM_FOLDER = {
  mac: "chromedriver-mac-x64",
  linux: "chromedriver-linux64",
  win: "chromedriver-win64",
};
const CHROME_EXTRACT_BIN = CHROME_HEADLESS_BIN ? {
  mac: "chrome-headless-shell-mac-x64/chrome-headless-shell",
  linux: "chrome-headless-shell-linux64/chrome-headless-shell",
  win: "chrome-headless-shell-win64/chrome-headless-shell.exe",
} : {
  mac: "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  linux: "chrome-linux64/chrome",
  win: "chrome-win64/chrome.exe",
};
const CHROME_NAME = CHROME_HEADLESS_BIN ? "chrome-headless-shell" : "chrome";
const { exec } = newSemaphore();

export const getExtensionFileName = (extensionId) =>
  `${SELENIUM_EXTENSION_PATH}/${extensionId}.crx`;
export const getUserCachePath = (id) =>
  exec(async () => {
    mkdirSync(SELENIUM_CACHE_PATH, { recursive: true });
    return `${SELENIUM_CACHE_PATH}/${id}`;
  });
export const getSnapshotPath = (id) =>
  exec(async () => {
    mkdirSync(SELENIUM_SNAPSHOT_PATH, { recursive: true });
    return `${SELENIUM_SNAPSHOT_PATH}/${id}.png`;
  });

export const getDriverPath = () => {
  const platform = getPlatform();
  const folder =
    CHROME_DRIVER_PLATFORM_FOLDER[platform] + CHROME_DRIVER_VERSION;
  let driverFileName = `${folder}/${CHROME_DRIVER_PLATFORM_FOLDER[platform]}/chromedriver`;
  switch (platform) {
    case "win":
      driverFileName = `${folder}/${CHROME_DRIVER_PLATFORM_FOLDER[platform]}/chromedriver.exe`;
      break;
  }
  const extractFolder = join(
    resolve(isElectronApp ? BINARY_LOCATION : "./bin"),
    folder
  );
  const extractBinFile = join(
    resolve(isElectronApp ? BINARY_LOCATION : "./bin"),
    driverFileName
  );
  const zipFile = join(
    resolve(isElectronApp ? BINARY_LOCATION : "./bin"),
    `${folder.replaceAll(CHROME_DRIVER_VERSION, "")}.zip`
  );
  const url = `${CHROME_DRIVER_DOWNLOAD_URL}/${CHROME_DRIVER_PLATFORM_FOLDER[
    platform
  ].replaceAll("chromedriver-", "")}/${folder.replaceAll(
    CHROME_DRIVER_VERSION,
    ""
  )}.zip`;
  const chromeExtractFolder = extractFolder.replaceAll(
    "chromedriver",
    CHROME_NAME
  );
  const chromeUrl = url.replaceAll("chromedriver", CHROME_NAME);
  const chromeZipFile = zipFile.replaceAll("chromedriver", CHROME_NAME);
  let chromeExtractBinFile = resolve(
    chromeExtractFolder,
    CHROME_EXTRACT_BIN[platform]
  );

  return {
    driverExtractFolder: extractFolder,
    driverExtractBinFile: extractBinFile,
    driverZipFile: zipFile,
    driverUrl: url,
    chromeExtractFolder: chromeExtractFolder,
    chromeExtractBinFile: chromeExtractBinFile,
    chromeZipFile: chromeZipFile,
    chromeUrl: chromeUrl,
  };
};

export const ensureChromeDriver = (secret) =>
  chromeDriverExec(async () => {
    {
      const {
        driverExtractFolder,
        driverExtractBinFile,
        driverZipFile,
        driverUrl,
        chromeExtractFolder,
        chromeExtractBinFile,
        chromeZipFile,
        chromeUrl,
      } = getDriverPath();
      if (!fs.existsSync(driverExtractBinFile)) {
        secret.log(`Tải driver ${driverUrl}`);
        mkdirSync(dirname(driverZipFile), { recursive: true });
        if (fs.existsSync(driverZipFile)) {
          secret.log(`Xóa file ${driverZipFile}`);
          fs.unlinkSync(driverZipFile);
        }
        await new DownloaderHelper(driverUrl, dirname(driverZipFile)).start();
        secret.log(
          `Extract zip file ${driverZipFile} to folder ${driverExtractFolder}`
        );
        await extract(driverZipFile, { dir: driverExtractFolder });
      }
      if (!fs.existsSync(chromeExtractBinFile)) {
        secret.log(`Tải chrome ${chromeUrl}`);
        mkdirSync(dirname(chromeZipFile), { recursive: true });
        if (fs.existsSync(chromeZipFile)) {
          secret.log(`Xóa file ${chromeZipFile}`);
          fs.unlinkSync(chromeZipFile);
        }
        await new DownloaderHelper(chromeUrl, dirname(chromeZipFile)).start();
        secret.log(
          `Extract zip file ${chromeZipFile} to folder ${chromeExtractFolder}`
        );
        await extract(chromeZipFile, { dir: chromeExtractFolder });
      }
      return {
        driverPath: driverExtractBinFile,
        chromePath: chromeExtractBinFile,
      };
    }
  });

export const switchToOrCreateWindow = async (
  secret,
  url,
  urlStartWith = url,
  refresh = true
) => {
  const windows = await getAllVisibleTabs(secret);
  for (const handle of windows) {
    await secret.driver.switchTo().window(handle);
    const currentUrl = await secret.driver.getCurrentUrl();
    if (currentUrl.startsWith(urlStartWith)) {
      if (currentUrl === url) {
        if (refresh) {
          secret.log(`Refresh url ${url}`);
          await secret.driver.navigate().refresh();
        }
      } else {
        secret.log(`Navigate from ${currentUrl} to url ${url}`);
        await secret.driver.navigate().to(url);
      }
      return;
    }
  }

  if (url.startsWith("chrome-extension")) {
    await switchToBlankPage(secret);
    await secret.driver.get(url);
    await sleep(2);
  } else {
    await openNewTab(secret, url);
    // await secret.driver.executeScript(`window.open('${url}').focus();`);
    // return switchToOrCreateWindow(secret, url, urlStartWith, false);
  }
};

export const openNewTab = async (secret, url = '') => {
  // await secret.driver.executeScript(`window.open('${url}').focus();`);
  // await sleep(0.5);
  await secret.driver.switchTo().newWindow('tab');
  // await secret.driver.findElement(By.css("body")).sendKeys(Key.CONTROL, "t")
  if (url) {
    secret.log(`Open url ${url}`)
    await secret.driver.get(url)
  }
}

export const switchToBlankPage = async (secret, url) => {
  const windows = await getAllVisibleTabs(secret);
  for (const handle of windows) {
    await secret.driver.switchTo().window(handle);
    const currentUrl = await secret.driver.getCurrentUrl();
    if (["about:blank", "chrome://new-tab-page/"].includes(currentUrl)) {
      secret.log(`Found blank page ${currentUrl}`)
      return true
    };
  }

  secret.log(`Open new tab`);
  await openNewTab(secret, url);
  return false;
  // return switchToBlankPage(secret);
};

export const getAllVisibleTabs = async (secret) => {
  const windows = await secret.driver.getAllWindowHandles();
  let visibleWindows = [];
  for (const handle of windows) {
    await secret.driver.switchTo().window(handle);
    if (await isVisibleTab(secret)) {
      visibleWindows.push(handle);
    }
  }
  return visibleWindows;
};

export const isVisibleTab = async (secret) => {
  return !(await isChromeOffscreen(secret));
};
export const isChromeOffscreen = async (secret) => {
  const currentUrl = await secret.driver.getCurrentUrl();
  return (
    currentUrl.includes("chrome-extension") && currentUrl.includes("offscreen")
  );
};

export const closeAllWindowStartWith = async (
  secret,
  urlStartWiths = ["*"]
) => {
  let newWindow;
  const windows = await getAllVisibleTabs(secret);
  for (const handle of windows) {
    await secret.driver.switchTo().window(handle);
    const currentUrl = await secret.driver.getCurrentUrl();
    if (
      urlStartWiths.some(
        (urlStartWith) =>
          (urlStartWith == "*" || currentUrl?.startsWith?.(urlStartWith)) && !["about:blank", "chrome://new-tab-page/"].includes(currentUrl)
      )
    ) {
      secret.log(`Close url ${currentUrl}`)
      const windows = await getAllVisibleTabs(secret);
      let done = false;
      if (windows.length == 1) {
        await openNewTab(secret);
        // await secret.driver.executeScript("window.open('').focus();");
        newWindow = true
        done = true;
      }
      await secret.driver.switchTo().window(handle);
      await secret.driver.close();
      if (done) break;
    }
  }
  if (newWindow) {
    await switchToBlankPage(secret);
  }
};

export const wait = async (secret, condition, timeout) => await secret.driver.wait(condition, timeout, undefined, 100)

export const waitOne = (secret, conditions = [], timeout) => new Promise(async (resolve) => {
  let result = new Array(conditions.length);
  let done = false;
  await Promise.all(conditions.map(async (condition, i) => {
    try {
      const data = await wait(secret, condition, timeout);
      if (data && !done) {
        done = true
        result[i] = data;
        resolve(result)
      }
    } catch (e) {
      result[i] = false
    }
  }))
  if (!done) {
    resolve(result);
  }
})

export const waitAll = (secret, conditions = [], timeout) => new Promise(async (resolve) => {
  let result = new Array(conditions.length);
  await Promise.all(conditions.map(async (condition, i) => {
    try {
      const data = await wait(secret, condition, timeout);
      if (data) {
        result[i] = data;
      }
    } catch (e) {
      result[i] = false
    }
  }))
  resolve(result);
});