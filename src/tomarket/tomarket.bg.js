import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { randomInt, sleep, sleepMs } from "../../utils/helper.js";
import { checkTask, claimClassmateStars, claimGame, claimTask, dailyClaim, endFarming, getBalance, getTasks, login, playGame, startFarming, startTask } from "../../utils/tomarket.js";

const { exec } = newSemaphore(100);
const SKIP_TGE_TASK = true;
const SKIP_CLASSMATE_TASK = true;

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-tomarket-${fileName}`, async (event) => {
    event.sender.send(`${fileName}-console`, `start-claim-tomarket-${fileName}`);

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
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${e?.status ? `(status=${e?.status})` : ""
            }: ${e?.response?.data?.message ||
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

const startClaim = async (secret) => {
  while (true) {
    let sleepTime = 60 * 60 * 1000;
    try {
      await exec(async () => {
        let access_token = await login(secret);

        let balance = await getBalance(secret, access_token);
        let { available_balance, play_passes, timestamp, daily, farming } =
          balance;
        secret.log(`Balance: ${available_balance}`);
        let lastCheckTs = balance.daily?.last_check_ts;
        if (!daily) {
          let isDaily = await dailyClaim(secret, access_token);
          if (isDaily) {
            secret.log(
              `Điểm danh hàng ngày thành công, phần thưởng: ${isDaily.today_points}`
            );
          }
        }
        const nowTimestamp = Math.floor(Date.now() / 1000);
        if (nowTimestamp > lastCheckTs + 24 * 60 * 60) {
          let isDaily = await dailyClaim(secret, access_token);
          if (isDaily) {
            secret.log(
              `Điểm danh hàng ngày thành công, phần thưởng: ${isDaily.today_points}`
            );
          }
        }
        let endFarmingTime = farming?.end_at;
        if (!farming) {
          let isFarm = await startFarming(secret, access_token);
          if (isFarm) {
            endFarmingTime = isFarm.end_at;
          }
        }
        if (timestamp > endFarmingTime) {
          let isClaim = await endFarming(secret, access_token);
          if (isClaim) {
            secret.log(
              `Đã thu hoạch cà chua thành công: + ${isClaim.claim_this_time} cà chua`
            );
            await sleep(3);
            let isFarm = await startFarming(secret, access_token);
            if (isFarm) {
              secret.log(
                `Start Farming...`
              );
              sleepTime = new Date(isFarm.end_at * 1000) - new Date() + 1000
            }
          }
        } else {
          sleepTime = new Date(endFarmingTime * 1000) - new Date() + 1000
        }
        secret.log(`Có ${play_passes} vé trò chơi`);
        while (play_passes > 0) {
          let isPlay = await playGame(secret, access_token);
          if (isPlay) {
            secret.log(`Bắt đầu chơi game...`);
            let gameTime = 25000;
            if (isPlay?.end_at) {
              gameTime = (isPlay?.end_at * 1000) - new Date().getTime()
            }
            await sleepMs(gameTime);
            let point = randomInt(300, 400);
            secret.log(`Claim game sau ${(gameTime / 1000).toFixed(0)} giây, ${point} TOMATO`);
            let isClaimGame = await claimGame(secret, access_token, point);
            if (isClaimGame) {
              secret.log(`Đã chơi game thành công, + ${point} TOMATO`);
              play_passes--;
            }
          }
        }
        let tasks = await getTasks(secret, access_token);
        let allTasks = Object.keys(tasks).flatMap((groupName) => tasks[groupName]?.default || tasks[groupName]  || [])
        secret.log(`${allTasks.length} tasks found`)
        for (const task of allTasks) {
          let {
            taskId,
            name,
            title,
            score: taskBonusAmount,
            status: taskStatus,
            platform,
            action,
            type,
            rankData,
            checkCounter,
            handleFunc,
          } = task, retryCheck = 5;
          if (action == "classmate" && SKIP_CLASSMATE_TASK) continue
          if (SKIP_TGE_TASK && type == "emoji") continue
          if (handleFunc && !["free_tomato", "bot"].includes(handleFunc)) continue
          if (["mysterious"].includes(type)) continue
          if (["invite"].includes(platform)) continue
          if (platform == "telegram" && !title.includes("Play") && !title.includes("Free Tomato") && !title.includes("X")) continue
          if (platform == "npc" && action == "checkInvite") {
            const { total: totalInvite } = await getInvite(secret, access_token)
            if (totalInvite < checkCounter) {
              secret.log(`Not enough invite for task ${title}, require ${checkCounter}, having ${totalInvite}`)
              continue;
            }
          }
          if (type == "classmate" && !rankData && !SKIP_CLASSMATE_TASK) {
            secret.log(`Claim starts`)
            try {
              const rankData = await claimClassmateStars(secret, access_token, taskId)
              secret.log(`Claim stars success! Stars=${rankData.stars}, top=${rankData.top}`)
              continue
            } catch(e) {
              if (e?.message?.includes?.("not within the valid time")) {
                secret.log("Timeout, can not claim stars")
                continue
              }
              throw e;
            }
          }
          if (taskStatus == 0) {
            let retry = 0;
            while (retry < 3) {
              try {
                secret.log(
                  `Start task ${title}`
                );
                const { status, message } = await startTask(
                  secret,
                  access_token,
                  taskId
                );
                if (status != 0) throw new Error(message)
                taskStatus = 1;
                retryCheck = 15;
                break
              } catch (e) {
                retry++;
                if (e?.message == "Task handle is not exist") {
                  secret.log(`Start task ${title} ERROR: ${e?.message}`);
                  break
                }
                secret.log(`ERROR: ${e?.message}`);
              } finally {
                await sleep(1)
              }
            }
          }
          if (taskStatus == 1) {
            let retry = 0;
            while (retry < retryCheck) {
              try {
                secret.log(
                  `Check task ${title} (${retry})`
                );
                const status = await checkTask(
                  secret,
                  access_token,
                  taskId
                );
                switch (status) {
                  case 1:
                    retry++
                    continue
                  default:
                    retry = retryCheck;
                    taskStatus = status
                    break
                }
              } catch (e) {
                retry++;
                secret.log(`ERROR: ${e?.message}`);
                if (e?.message?.includes?.("Init data expired")) {
                  break
                }
              } finally {
                await sleep(1)
              }
            }
          }
          if (taskStatus == 2) {
            let retry = 0;
            while (retry < 3) {
              try {
                secret.log(
                  `Claim task ${title}`
                );
                const { message, status } = await claimTask(
                  secret,
                  access_token,
                  taskId
                );
                if (status != 0) throw new Error(message)
                secret.log(
                  `Claim task ${title} SUCCESS! +${taskBonusAmount} TOMATO`
                );
                break
              } catch (e) {
                retry++;
                secret.log(`ERROR: ${e?.message}`);
              } finally {
                await sleep(1)
              }
            }
          }
        }
      });
    } catch (e) {
      if (e?.message == "Invalid Token.") {
        secret.log("Token đã hết hạn");
        sleepTime = 0;
        return
      }
      sleepTime = 60_000;
      secret.error(e);
    } finally {
      if (sleepTime > 0) {
        secret.log(`Ngủ ${(sleepTime / (1000 * 60)).toFixed(0)} phút...`);
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
};
