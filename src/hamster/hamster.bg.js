import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import {
  buyUpgrades,
  checkTasks,
  getHamsterSync,
  parseTgUserId,
} from "../../utils/hamster.js";
import {
  isDone,
  setDone,
} from "../../utils/helper.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(100);
const CEIL_PRICES = [10000];
const MAX_RETRY_PLAYING_MINIGAME = 5;
const checkTasksKey = (id) => `hamster_checkTasks_${id}`;
const passiveEarnKey = (id) => `hamster_passive_earn_${id}`;

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-hamster-${fileName}`, async (event) => {
    const secrets = await getSecretsByFileName(fileName);
    event.sender.send(
      `${fileName}-console`,
      `Đã load ${secrets.length} địa chỉ!`
    );
    await Promise.all(
      secrets.map(async (secret) => {
        secret = { ...secret };
        secret.log = (msg) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} ${msg}`
          );
          console.log(msg);
        };
        secret.error = (e) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${
              e?.status ? ` (status=${e?.status})` : ""
            }: ${
              e?.response?.data?.message ||
              e?.data?.message ||
              e?.message ||
              JSON.stringify(e)
            }`
          );
          console.error(e);
        };
        await autoClick(secret);
      })
    );
  });
};

const autoClick = async (secret) => {
  let tgUserId;
  while (true) {
    let nextTime = 1000;
    try {
      await exec(async () => {
        if (!tgUserId) {
          tgUserId = await parseTgUserId(secret);
        }
        nextTime = 2 * 60 * 60 * 1000;
        if (isDone(passiveEarnKey(tgUserId))) return
        const { level, lastPassiveEarn } = await reqExec(() =>
          getHamsterSync(secret)
        );
        secret.log(`Nhận passive earn ${lastPassiveEarn}`);
        // check daily task
        if (!isDone(checkTasksKey(tgUserId))) {
          secret.log("Kiểm tra nhiệm vụ");
          await reqExec(() =>
            checkTasks(secret, [
              "streak_days",
              "streak_days_special",
              "hamster_youtube",
            ])
          );
          setDone(checkTasksKey(tgUserId), 8 * 60 * 60_000);
        }
        let ceilPrices = CEIL_PRICES;
        secret.log("Kiểm tra thẻ có thể nâng cấp");
        for (const ceilPrice of ceilPrices) {
          await reqExec(() => buyUpgrades(secret, ceilPrice));
        }
        setDone(passiveEarnKey(tgUserId), 2 * 60 * 60_000);
      });
    } catch (e) {
      secret.error(e);
      nextTime = 5 * 60_000;
      if (e?.response?.status == 401) {
        secret.log("Token ko hợp lệ, thoát game!")
        nextTime = 0;
        return
      }
    } finally {
      if (nextTime > 0) {
        secret.log(
          `Nhận passive earn sau ${(nextTime / 60_000).toFixed(2)} phút`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, nextTime));
    }
  }
};
