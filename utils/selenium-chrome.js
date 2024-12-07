//src/utils/selenium-chrome.js
import { Options, ServiceBuilder } from "selenium-webdriver/chrome.js";
import { Builder } from "selenium-webdriver/index.js";
import { manual } from "selenium-webdriver/proxy.js";
import { anonymizeProxy } from "proxy-chain";
import {
  ensureChromeDriver,
  getExtensionFileName,
  getUserCachePath,
} from "./selenium.js";
import { newSemaphore, newSemaphoreMap, threadSafeMap } from "./semaphore.js";
import {
  downloadExtension,
  getRegisteredExtensions,
} from "./selenium-extensions.js";
import { getSeleniumThreads } from "./os.js";
import EventEmitter from "node:events";
import { isDone, setDone, sleep } from "./helper.js";

const HEADLESS_MODE = true;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36";
const ALLOW_DEBUG = false;
const CHROME_INSTANCE_EXPIRE_TIME = 3 * 60 * 60_000; // ms seconds
const eventSource = new EventEmitter();
eventSource.setMaxListeners(0);
const threadCount = getSeleniumThreads();
const { exec } = newSemaphore(threadCount);
const { execBy } = newSemaphoreMap();
const { getOrSetIfEmpty, deleteVal } = threadSafeMap(execBy);
async function getDriverOptions(secret, id) {
  const options = new Options();

  const cachePath = await getUserCachePath(id);

  options.addArguments(`user-agent=${USER_AGENT}`);
  if (HEADLESS_MODE) {
    options.addArguments("--window-position=-2400,-2400");
    options.addArguments("--headless=chrome");
  }
  options.addArguments("--ignore-certificate-errors");
  options.addArguments("--ignore-ssl-errors");
  options.addArguments("--no-sandbox");
  options.addArguments("--remote-allow-origins=*");
  options.addArguments("enable-automation");
  options.addArguments("--disable-infobars");
  options.addArguments("--dns-prefetch-disable");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--disable-ipv6");
  options.addArguments("--disable-gpu");
  options.addArguments("--disable-blink-features=AutomationControlled");
  options.addArguments("--disable-client-side-phishing-detection");
  options.addArguments("--disable-default-apps");
  options.addArguments("--disable-popup-blocking");
  options.addArguments("--disable-sync");
  options.addArguments("--no-first-run");
  options.addArguments("--password-store=basic");
  options.addArguments("--disable-renderer-backgrounding");
  options.addArguments("--disable-background-timer-throttling");
  options.addArguments("--disable-backgrounding-occluded-windows");
  options.addArguments("--disable-crash-reporter");
  options.addArguments("--disable-oopr-debug-crash-dump");
  options.addArguments("--no-crash-upload");
  options.addArguments("--disable-low-res-tiling");
  options.addArguments("--disable-software-rasterizer");
  options.addArguments("--ash-no-nudges");
  options.addArguments("--disable-search-engine-choice-screen");
  options.addArguments("--disable-background-networking");
  options.addArguments("--disable-breakpad");
  options.addArguments("--disable-component-update");
  options.addArguments("--use-gl=desktop");
  // options.addArguments("--use-angle=swiftshader");
  options.addArguments("--disable-accelerated-2d-canvas");
  options.addArguments("--disable-web-security");
  options.addArguments("--renderer-process-limit=2");
  options.addArguments("--purge-memory-button");
  options.addArguments("--memory-model=low");
  options.addArguments("--disable-site-isolation-trials");
  options.addArguments("--disable-gpu-compositng");
  options.addArguments("--disable-domain-reliability");
  options.addArguments("--disable-features=IsolateOrigins");
  options.addArguments("--remote-debugging-pipe");
  options.addArguments("--use-mock-keychain");

  // Tối ưu chrome options
  options.addArguments('--disable-extensions');
  options.addArguments('--disable-smooth-scrolling');
  options.addArguments('--disable-translate');
  options.setPageLoadStrategy('eager');

  options.addArguments(`user-data-dir=${cachePath}`);
  options.addArguments("profile-directory=Default");
  options.setUserPreferences({
    profile: {
      default_content_settings: {
        images: 2,
        css: 2,
        fonts: 2,
      },
      managed_default_content_settings: {
        images: 2,
        css: 2,
        fonts: 2,
      },
    },
    session: {
      restore_on_startup: 4,
    },
  });
  // options.addArguments("--aggressive-cache-discard")
  // options.addArguments("--disable-cache")
  // options.addArguments("--disable-application-cache")
  // options.addArguments("--disable-offline-load-stale-cache")
  // options.addArguments("--disk-cache-size=0")
  // options.addArguments("--remote-debugging-port")
  secret.log(`Profile was stored at ${cachePath}`);

  if (secret.proxy) {
    // secret.log(`Thiết lập proxy: ${secret.proxyStr}`);

    const { user, passsword, ip, port } = secret.proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    // secret.log(proxyStr)
    const newProxyUrl = await anonymizeProxy(proxyStr);
    // const newProxyUrl = proxyStr;
    // secret.log(`URL proxy mới: ${newProxyUrl}`)

    options.setProxy(
      manual({
        http: newProxyUrl,
        https: newProxyUrl,
      })
    );
    const url = new URL(newProxyUrl);
    options.addArguments(`--proxy-server=socks5://${url.hostname}:${url.port}`);
  }

  return options;
}
const eventDeletedEventKey = (id) => `selenium-chrome-${id}-deleted`;
const seleniumIsInstanceAliveKey = (id) => `selenium_chrome_alive_v1_${id}`;

export async function runTask(secret, id, task = async () => {}) {
  return await exec(() =>
    getOrSetIfEmpty(
      id,
      async () => {
        secret.log(`Tạo chrome instance với id ${id}`);
        const options = await getDriverOptions(secret, id);
        await Promise.all(
          getRegisteredExtensions(id).map(async (extensionId) => {
            const extensionFilename = getExtensionFileName(extensionId);
            await downloadExtension(secret, extensionId, USER_AGENT);
            options.addExtensions([extensionFilename]);
          })
        );

        if (ALLOW_DEBUG) {
          options.addArguments("--enable-logging");
          options.addArguments("--v=1");
        }

        const { driverPath: chromedriverPath, chromePath } =
          await ensureChromeDriver(secret);
        const serviceBuilder = new ServiceBuilder(chromedriverPath);
        options.setBinaryPath(chromePath);
        // secret.log(
        //   `Create headless browser with chromedriver path ${chromedriverPath} and chrome path ${chromePath}`
        // );
        const driver = new Builder()
          .forBrowser("chrome")
          .setChromeService(serviceBuilder)
          .setChromeOptions(options)
          .build();
        return driver;
      },
      task,
      () => {
        secret.log(
          `Chrome instance created, close after ${(
            CHROME_INSTANCE_EXPIRE_TIME / 60_000
          ).toFixed(1)} minutes`
        );
        setDone(seleniumIsInstanceAliveKey(id), CHROME_INSTANCE_EXPIRE_TIME);
        setTimeout(async () => {
          if (isDone(seleniumIsInstanceAliveKey(id))) {
            secret.log("Callback is invalid, don't close chrome instance");
            return
          }
          secret.log(`Close chrome instance ${id}`);
          await deleteInstance(secret, id);
        }, CHROME_INSTANCE_EXPIRE_TIME);
      }
    )
  );
}

export async function onInstanceDeleted(id, callback = async (id) => {}) {
  eventSource.addListener(
    eventDeletedEventKey(id),
    async (id) => await callback(id)
  );
}

export async function deleteInstance(secret, id, fireEventAfterSeconds = 3) {
  await exec(() =>
    deleteVal(id, async (driver) => {
      await driver.quit();
      await sleep(fireEventAfterSeconds);
      const listenerCount = eventSource.listeners(eventDeletedEventKey(id)).length;
      secret.log(`Found ${listenerCount} listeners, fire deleted event`);
      eventSource.emit(eventDeletedEventKey(id), id);
    })
  );
}
