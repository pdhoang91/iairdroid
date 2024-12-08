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
const MAX_LOGIN_RETRIES = 3;
const MAX_EXTENSION_RETRIES = 3;

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
  [secret.username, secret.proxy?.ip, secret?.receiveAddress ? secret?.receiveAddress : null]
    .filter((val) => val)
    .join("@");

/**
 * Enhanced login status check with better verification
 */
const isLoggedIn = async (secret, handleException = true) => {
  try {
    // Chỉ kiểm tra element cho trạng thái đã đăng nhập
    const loggedInElement = await wait(
      secret,
      elementLocated(By.xpath('//*[contains(text(), "Copy Referral Link")]')),
      10_000
    ).catch(() => false);

    if (loggedInElement) {
      return true;
    }

    // Chỉ kiểm tra login form nếu chưa tìm thấy element đã đăng nhập
    const loginElement = await wait(
      secret,
      elementLocated(By.xpath('//*[contains(text(), "Log In")]')),
      5_000
    ).catch(() => false);

    return false;
  } catch (e) {
    if (handleException) return false;
    throw e;
  }
};

/**
 * Handle login process with improved state checking
 */
async function handleLogin(secret, maxRetries = MAX_LOGIN_RETRIES) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      // Kiểm tra lại trạng thái đăng nhập trước khi thực hiện
      const alreadyLoggedIn = await isLoggedIn(secret);
      if (alreadyLoggedIn) {
        secret.log("Already logged in, skipping login process");
        return true;
      }

      secret.log(`Login attempt ${attempt + 1} for ${secret.username}`);
      
      const emailInput = By.css('[placeholder="Enter Email"]');
      const passwordInput = By.css('[type="password"]');
      const loginButton = By.css("button");

      await wait(secret, elementLocated(emailInput), 120_000);
      await wait(secret, elementLocated(passwordInput), 60_000);
      await wait(secret, elementLocated(loginButton), 60_000);

      await secret.driver.findElement(emailInput).clear();
      await secret.driver.findElement(emailInput).sendKeys(secret.username);
      await secret.driver.findElement(passwordInput).clear();
      await secret.driver.findElement(passwordInput).sendKeys(secret.password);
      await secret.driver.findElement(loginButton).click();

      // Verify login status after attempt
      for (let i = 0; i < 5; i++) {
        await sleep(3);
        const loggedIn = await isLoggedIn(secret);
        if (loggedIn) {
          secret.log("Login successful!");
          return true;
        }
      }

      attempt++;
      await sleep(3);
    } catch (error) {
      attempt++;
      secret.error(`Login error: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await sleep(3);
    }
  }
  throw new Error("Login failed after max retries");
}

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

export async function runAccount(secret, takeSnapshot = false, runOnce = false) {
  await runTaskChrome(secret, async() => {
    secret.log(`Checking account ${secret.username}...`);
    await switchToOrCreateWindow(secret, "https://app.gradient.network", "https://app.gradient.network");
    await sleep(3);

    const loggedIn = await isLoggedIn(secret);
    if (!loggedIn) {
      secret.log(`Logging in ${secret.username}...`);
      await handleLogin(secret);
    } else {
      secret.log(`${secret.username} is already logged in`);
    }

    secret.log(`${secret.username} logged in! Opening extension...`);
    const status = await openExtensionPage(secret, true);
    if (!status) {
      throw new Error("Failed to get extension status");
    }

    if (takeSnapshot) {
      await takeCurrentScreenSnapshot(secret);
    }
  });

  if (runOnce) return;

  // Start monitoring
  let disconnectedCount = 0;
  while (true) {
    let sleepTime = CHECK_STATUS_PERIOD;
    await runTaskChrome(secret, async () => {
      try {
        const status = await openExtensionPage(secret, true, true);
        
        if (!status) {
          secret.log(`ERROR: Status not found`);
          disconnectedCount++;
          sleepTime = 60;
        } else {
          secret.log(
            `Node Status: ${status} ${secret?.proxy?.ip ? `(${secret?.proxy?.ip})` : ""}`
          );

          if (!status?.includes?.("Good")) {
            disconnectedCount++;
            sleepTime = 60;
          } else {
            disconnectedCount = 0;
          }
        }
      } catch (error) {
        secret.error(error);
        if (error.message.includes("Unsupported proxy")) {
          await setUnsupportedProxy(secret);
          throw error;
        }
        disconnectedCount++;
        sleepTime = 60;
      }
    });

    if (disconnectedCount >= DISCONNECT_COUNT_TO_RESTART) {
      secret.log(`Node disconnected too many times, restarting...`);
      throw new Error(`Node disconnected`);
    }
    
    await sleep(sleepTime);
  }
}

export const openExtensionPage = async (secret, retry = true, throwExceptionIfNotLogIn = false) => {
  let attempts = 0;
  while (attempts < MAX_EXTENSION_RETRIES) {
    try {
      const extensionUrl = `chrome-extension://${GRADIENT_EXTENSION_ID}/popup.html`;
      await switchToOrCreateWindow(secret, extensionUrl);
      
      const currentUrl = await secret.driver.getCurrentUrl();
      if (currentUrl !== extensionUrl) {
        throw new Error(`URL mismatch: ${currentUrl}`);
      }

      // Handle loading screen
      secret.log("Checking loading screen...");
      const loadingScreenOn = await wait(
        secret, 
        elementLocated(By.xpath("//img[contains(@src, 'gradient-anime.gif')]")),
        15_000
      ).catch(() => false);

      if (loadingScreenOn) {
        secret.log("Waiting for loading screen to complete...");
        while (true) {
          const loading = await wait(
            secret,
            elementLocated(By.xpath("//img[contains(@src, 'gradient-anime.gif')]")),
            1000
          ).catch(() => false);
          
          if (!loading) {
            secret.log("Loading completed");
            break;
          }
          await sleep(0.2);
        }
      }

      // Check login status
      const refElement = By.xpath('//*[contains(text(), "Referral Code:")]');
      const loginElement = By.xpath('//*[contains(text(), "Log in")]');
      const statusElement = By.css(".absolute.mt-3.right-0.z-10");

      const [_, isNotLogIn] = await waitOne(
        secret,
        [elementLocated(refElement), elementLocated(loginElement)],
        30_000
      );

      if (isNotLogIn) {
        if (retry) {
          secret.log("Extension not logged in, retrying...");
          return openExtensionPage(secret, false);
        }
        if (throwExceptionIfNotLogIn) {
          throw new Error('Extension not logged in');
        }
        secret.log("Extension not logged in");
        return null;
      }

      // Check region availability
      const isNotAvailable = await secret.driver
        .findElement(By.xpath('//*[contains(text(), "Sorry, Gradient is not yet available in your region.")]'))
        .catch(() => false);

      if (isNotAvailable) {
        secret.log("Region not supported");
        throw new Error("Unsupported proxy");
      }

      // Get status
      if (!isNotLogIn) {
        await wait(secret, elementLocated(statusElement), 30_000);
        const status = await secret.driver
          .findElement(statusElement)
          .getText()
          .catch(() => null);

        if (status?.includes?.("Unsupported")) {
          await closeAllWindowStartWith(secret, [
            "https://app.gradient.network",
            `chrome-extension://${GRADIENT_EXTENSION_ID}`,
          ]);
          throw new Error("Unsupported proxy");
        }
        
        return status;
      }

      return null;
    } catch (error) {
      attempts++;
      secret.error(`Extension error (attempt ${attempts}): ${error.message}`);
      
      if (error.message.includes("Unsupported proxy")) {
        throw error;
      }
      
      if (attempts === MAX_EXTENSION_RETRIES) {
        throw error;
      }
      
      await sleep(3);
    }
  }
};