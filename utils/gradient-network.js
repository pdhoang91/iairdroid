//utils/gradient-network.js
// import chromedriver from "chromedriver";
// import "chromedriver";
import { By } from "selenium-webdriver/lib/by.js";
import fs from "fs";
import {
  closeAllWindowStartWith,
  getSnapshotPath,
  switchToOrCreateWindow,
  wait,
  waitOne,
} from "./selenium.js";
import { elementLocated } from "selenium-webdriver/lib/until.js";
import { isDone, setDone, sleep } from "./helper.js";
import { deleteInstance, onInstanceDeleted, runTask } from "./selenium-chrome.js";
import { GRADIENT_EXTENSION_ID } from "./selenium-extensions.js";

const DISCONNECT_COUNT_TO_RESTART = 3;
const CHECK_STATUS_PERIOD = 30 * 60; // seconds
const WEEK = 7 * 24 * 60 * 60_000;

export const isUnsupportProxyKey = (ip) => `gradient_unsupported_proxy_${ip}`;

export const isRunWithUnsupportedProxy = (secret) => {
  return isDone(isUnsupportProxyKey(secret?.proxy?.ip || ""))
}

export const setUnsupportedProxy = (secret) => {
  return setDone(isUnsupportProxyKey(secret?.proxy?.ip || ""), WEEK)
}

async function takeScreenshot(secret, filename) {
  const data = await secret.driver.takeScreenshot();
  fs.writeFileSync(filename, Buffer.from(data, "base64"));
}

async function takeCurrentScreenSnapshot(secret) {
  await takeScreenshot(secret, await getSnapshotPath(generateUniqueId(secret)));
}


export const generateUniqueId = (secret) =>
  [secret.username, secret.proxy?.ip, secret?.receiveAddress ? secret?.receiveAddress : null].filter((val) => val).join("@");

const isLoggedIn = async (secret, handleException = true) => {
  try {
    const [isLoggedIn] = await waitOne(secret,
      [
        elementLocated(By.xpath('//*[contains(text(), "Copy Referral Link")]')),
        elementLocated(By.xpath('//*[contains(text(), "Log In")]'))
      ],
      120_000
    );
    return isLoggedIn;
  } catch (e) {
    if (handleException) return false;
    throw e;
  }
};

export const runTaskChrome = async(secret, task = async() => {}) => {
  return await runTask(secret, generateUniqueId(secret), async(driver) => {
    secret.driver = driver;
    await task(driver);
  });
}

export const closeChrome = async(secret) => {
  await deleteInstance(secret, generateUniqueId(secret));
}

export const renewOnInstanceClosed = async(secret) => {
  let renew = true;
  secret.log(`Register auto reload chrome instance`);
  onInstanceDeleted(generateUniqueId(secret), async() => {
    if (renew) {
      let retry = 0;
      while(true) {
        retry++;
        if (retry > 3) return
        try {
          secret.log(`Chrome instance closed, reinit (${retry})`);
          await runAccount(secret, false, true);
          return
        } catch(e) {
          secret.log(`ERROR: Chrome instance reinit fail: ${e?.message}`);
        }
      }
    }
  })
  const stopRenewIfInstanceClose = () => {
    secret.log(`Unregister auto reload chrome instance`);
    renew = false;
  }
  return stopRenewIfInstanceClose
}

// let serviceBuilder;
export async function runAccount(
  secret,
  takeSnapshot = false,
  runOnce = false,
) {
  await runTaskChrome(secret, async() => {
    secret.log(`Kiểm tra tài khoản ${secret.username}...`);
    await switchToOrCreateWindow(secret, "https://app.gradient.network", "https://app.gradient.network");
    await sleep(3);
    const loggedIn = await isLoggedIn(secret);
    if (!loggedIn) {
      secret.log(`Đăng nhập ${secret.username}...`);
      const emailInput = By.css('[placeholder="Enter Email"]');
      const passwordInput = By.css('[type="password"]');
      const loginButton = By.css("button");
      await wait(secret, elementLocated(emailInput), 120_000);
      await wait(secret, elementLocated(passwordInput), 60_000);
      await wait(secret, elementLocated(loginButton), 60_000);

      await secret.driver.findElement(emailInput).sendKeys(secret.username);
      await secret.driver.findElement(passwordInput).sendKeys(secret.password);
      await secret.driver.findElement(loginButton).click();
      await sleep(5);
      let retry = 0;
      while (true) {
        retry++;
        secret.log(
          `Kiểm tra trạng thái đăng nhập ${secret.username} (${retry})...`
        );
        const loggedIn = await isLoggedIn(secret);
        if (loggedIn) break;
        await sleep(5);
        if (retry == 3) throw new Error("Chưa login");
      }
    }
    secret.log(`${secret.username} đã đăng nhập! Mở extension`);
    await openExtensionPage(secret, true);
    if (takeSnapshot) {
      await takeCurrentScreenSnapshot(secret);
    }
  });
  if (runOnce) return

  let disconnectedCount = 0;
  while (true) {
    let sleepTime = CHECK_STATUS_PERIOD;
    await runTaskChrome(secret, async () => {
      let supportStatus, currentUrl;
      try {
        supportStatus = await openExtensionPage(secret, true, true);
        currentUrl = await secret.driver.getCurrentUrl();
        if (takeSnapshot) {
          await takeCurrentScreenSnapshot(secret);
        }
      } catch (e) {
        secret.error(e);
        disconnectedCount++;
        sleepTime = 60;
        return;
      }
      if (!supportStatus) {
        secret.log(`ERROR: Support status not found: ${supportStatus} for current url ${currentUrl}`);
        disconnectedCount += 1;
      } else {
        secret.log(
          `Node Status: ${supportStatus} ${secret?.proxy?.ip ? `(${secret?.proxy?.ip})` : ""
          }`
        );
      }

      if (!supportStatus?.includes?.("Good")) {
        disconnectedCount++;
      } else {
        disconnectedCount = 0;
      }
    });
    if (disconnectedCount >= DISCONNECT_COUNT_TO_RESTART) {
      secret.log(`Node disconnect quá lâu, khởi động lại`);
      throw new Error(`Node disconnected`);
    }
    await sleep(sleepTime);
  }
}

export const openExtensionPage = async (secret, retry = true, throwExceptionIfNotLogIn = false) => {
  const extensionUrl = `chrome-extension://${GRADIENT_EXTENSION_ID}/popup.html`;
  await switchToOrCreateWindow(
    secret,
    extensionUrl
  );
  const currentUrl = await secret.driver.getCurrentUrl();
  const refElement = By.xpath('//*[contains(text(), "Referral Code:")]')
  const statusElement = By.css(".absolute.mt-3.right-0.z-10")
  const loginElement = By.xpath('//*[contains(text(), "Log in")]');
  secret.log("Wait loading screen")
  const loadingScreenOn = await wait(secret, elementLocated(By.xpath("//img[contains(@src, 'gradient-anime.gif')]")), 15_000).catch(() => false)
  if (loadingScreenOn) {
    secret.log("Loading screen on")
  }
  while(true) {
    const loading = await wait(secret, elementLocated(By.xpath("//img[contains(@src, 'gradient-anime.gif')]")), 1000).catch(() => false)
    if (!loading) {
      if (loadingScreenOn) {
        secret.log("Loading screen turn off")
      }
      break
    }
    await sleep(0.2);
  }
  secret.log("Wait element located")
  const [isLogin, isNotLogIn] = await waitOne(secret, [elementLocated(refElement), elementLocated(loginElement)], 30_000);
  if (currentUrl != extensionUrl && (!isLogin && !isNotLogIn)) {
    secret.log(`Url not correct, current ${currentUrl}, expect ${extensionUrl}`)
    return openExtensionPage(secret, retry, throwExceptionIfNotLogIn);
  }
  if (isNotLogIn) {
    if (retry) {
      secret.log("Extension not logged in, reload");
      return openExtensionPage(secret, false);
    } else {
      if (throwExceptionIfNotLogIn) {
        throw new Error('Extension not logged in')
      }
      secret.log("Extension not logged in");
    }
  }
  const isNotAvailable = await secret.driver
    .findElement(
      By.xpath(
        '//*[contains(text(), "Sorry, Gradient is not yet available in your region.")]'
      )
    )
    .catch(() => false);
  if (isNotAvailable) {
    secret.log(`Gradient not available in region`);
    throw new Error("Unsupported proxy");
  }
  if (!isNotLogIn) {
    await wait(secret, elementLocated(statusElement), 30_000).catch(() => false);
    const supportStatus = await secret.driver
      .findElement(statusElement)
      .getText()
      .catch(() => null);
    if (supportStatus?.includes?.("Unsupported")) {
      await closeAllWindowStartWith(secret, [
        "https://app.gradient.network",
        `chrome-extension://${GRADIENT_EXTENSION_ID}`,
      ]);
      throw new Error("Unsupported proxy");
    }
    return supportStatus;
  }
};
