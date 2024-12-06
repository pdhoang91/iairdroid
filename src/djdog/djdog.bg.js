import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";

import {
  login,
  getBarAmount,
  collect,
  startAdopt,
  getPetInfo,
  upMaxLevel,
  getBoxData,
  buyBox,
  calculateExpectedBox,
  calculateMaxLevel,
  getDailyMissions,
  finishDailyTask,
} from "../../utils/djdog.js";
import { sleep } from "../../utils/helper.js";

const { exec } = newSemaphore(50);

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-djdog-${fileName}`, async (event) => {
    event.sender.send(`${fileName}-console`, `start-claim-djdog-${fileName}`);

    const secrets = await getSecretsByFileName(fileName);
    event.sender.send(
      `${fileName}-console`,
      `Đã load ${secrets.length} địa chỉ!`
    );
    await Promise.all(
      secrets.map(async (secret) => {
        secret = { ...secret };
        secret.log = (msg) => {
          msg = `${secret.id}${secret.proxy ? " (proxy)" : ""} ${msg}`;
          event.sender.send(`${fileName}-console`, msg);
          console.log(msg);
        };
        secret.error = (e) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${
              e?.status ? `(status=${e?.status})` : ""
            }: ${
              e?.response?.data?.message ||
              e?.data?.message ||
              e?.message ||
              JSON.stringify(e)
            }`
          );
          console.error(e);
        };
        await startClaim(secret);
      })
    );
  });
};

const AUTO_MAX_LEVEL = 40,
  MIN_CLICK = 30;

const startClaim = async (secret) => {
  let done = false;
  while (!done) {
    let err = false;
    let sleepTime = 4 * 60 * 60 * 1000;
    try {
      await exec(async () => {
        let { access_token, data } = await login(secret);
        let { adopted, level } = await getPetInfo(secret, access_token);
        if (!adopted) {
          secret.log("Not yet adopted so start adopt pet");
          await startAdopt(secret, access_token);
        }
        const dailyMissions = await getDailyMissions(secret, access_token);
        for (const task of dailyMissions) {
          const { id, finished, title, jumpPath, rewardAmount } = task;
          if (finished) continue;

          let retry = 0;
          while (retry < 3) {
            secret.log(`Làm task hằng ngày ${title}`);
            try {
              const { returnCode, returnDesc } = await finishDailyTask(
                secret,
                access_token,
                id
              );
              if (returnCode == 200) {
                secret.log(
                  `Xong task hằng ngày ${title}! +${rewardAmount} Hit`
                );
                break;
              } else throw new Error(returnDesc);
            } catch (e) {
              retry++;
              secret.error(e);
            }
          }
        }
        let { boxAmount } = await getBoxData(secret, access_token);
        let maxLevel = calculateMaxLevel(AUTO_MAX_LEVEL, boxAmount, level);
        const expectedBox = calculateExpectedBox(level);
        if (boxAmount >= expectedBox) {
          level += await upMaxLevel(secret, access_token, maxLevel);
        }

        let {
          availableClick,
          availableAmount,
          clickCoefficient,
          harvestExpireTime,
        } = await getBarAmount(secret, access_token);
        while (availableClick > 0) {
          let click = 100;
          if (click * clickCoefficient > availableAmount) {
            click = Math.floor(availableAmount / clickCoefficient);
          }
          if (click < MIN_CLICK) break;
          await collect(secret, access_token, click, false);
          availableClick -= 1;
          availableAmount -= click * clickCoefficient;
        }
        if (level >= 50) {
          if (!harvestExpireTime) {
            await collect(secret, access_token, 0, true);
            let { harvestExpireTime } = await getBarAmount(
              secret,
              access_token
            );
            sleepTime = harvestExpireTime;
          } else {
            sleepTime = harvestExpireTime;
          }
        }

        if (level >= 40) {
          const expectedBox = calculateExpectedBox(level);
          while (boxAmount < expectedBox) {
            const { goldAmount } = await getBarAmount(secret, access_token);
            if (goldAmount >= 100_000) {
              secret.log(`Mua 1 rương`);
              await buyBox(secret, access_token);
              boxAmount += 1;
            } else {
              break;
            }
          }

          secret.log(`Có ${boxAmount}/${expectedBox} rương!`);
        }
      });
    } catch (e) {
      err = true;
      sleepTime = 10_000;
      if ((e?.message || "").includes("Harvest limit reached for today")) {
        sleepTime = 60 * 60 * 1000;
        secret.log(`Gọi request quá thường xuyên, đợi 1 tiếng`);
      } else if (
        (e?.message || "").includes(
          "Frequent requests. Please try again after"
        ) ||
        (e?.message || "").includes("Try Harvest again in")
      ) {
        try {
          let parts = e?.message?.split(
            "Frequent requests. Please try again after "
          );
          if ((e?.message || "").includes("Try Harvest again in")) {
            parts = e?.message?.split("Try Harvest again in ");
          }
          if (
            e?.message?.endsWith("minutes") ||
            e?.message?.endsWith("minutes!")
          ) {
            const minute = parseInt(
              parts[parts.length - 1]
                ?.replaceAll(" minutes!", "")
                ?.replaceAll(" minutes", "")
            );
            // sleepTime = minute * 60 * 1000;
            // secret.log(`Gọi request quá thường xuyên, đợi ${minute} phút`);
            sleepTime = 60 * 60 * 1000;
            secret.log(`Gọi request quá thường xuyên, đợi 1 tiếng`);
          } else if (e?.message?.endsWith("hours")) {
            const hour = parseInt(
              parts[parts.length - 1].replaceAll(" hours", "")
            );
            // sleepTime = hour * 60 * 60 * 1000;
            // secret.log(`Gọi request quá thường xuyên, đợi ${hour} giờ`);
            sleepTime = 60 * 60 * 1000;
            secret.log(`Gọi request quá thường xuyên, đợi 1 tiếng`);
          }
        } catch (err) {
          secret.error(e);
        }
      } else if (e?.message == "auth expired") {
        secret.log("Token đã hết hạn, cần lấy token mới");
        done = true;
      } else {
        secret.error(e);
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    } finally {
      if (err) {
        err = false;
        continue;
      }
      secret.log(`Ngủ ${(sleepTime / (1000 * 60)).toFixed(0)} phút...`);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
};
