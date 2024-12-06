import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";

import {
  login,
  getAccountInfo,
  getAccountBuildInfo,
  getGameInfo,
  applyEnergyBoost,
  claim,
  applyTurboBoost,
  sendTapsWithTurbo,
  autoUpgradeAll,
  claimYespacBonus,
  getYespacBonus,
  getWallet,
  offline,
  turnOnYespac,
  getDailyTasks,
  checkDailyTask,
  clickDailyTask,
  claimDailyTaskReward,
  getTaskBonus,
  claimCommonTaskBonus,
  getSignInTasks,
  getDailyPost,
  claimSignInTask,
  claimDailyTaskBonus,
  getTaskList,
  clickTask,
  checkTask,
  claimTaskReward,
} from "../../utils/yescoin.js";
import {
  isDone,
  parseTgUserFromInitParams,
  randomInt,
  setDone,
} from "../../utils/helper.js";

const { exec } = newSemaphore(150);
const MAX_RETRY = 3;

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-yescoin-${fileName}`, async (event) => {
    event.sender.send(`${fileName}-console`, `start-claim-yescoin-${fileName}`);

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
        await startClaim(secret);
      })
    );
  });
};

const DEFAULT_TIME = 1_000_000_000_000;
const checkTasksKey = (id) => `yescoin_checkTasks_${id}`;
const startClaim = async (secret) => {
  while (true) {
    let waitTime = DEFAULT_TIME;
    const setWaitTime = (newTime) => {
      if (newTime < waitTime) {
        waitTime = newTime;
      }
    };
    try {
      await exec(async () => {
        const { id } = parseTgUserFromInitParams(secret.privateKey);
        let access_token = await login(secret);
        if (access_token) {
          // auto claim
          await autoUpgradeAll(secret, access_token);
          let boosts_info = await getAccountBuildInfo(secret, access_token);
          const gameInfo = await getGameInfo(secret, access_token);
          const claimFn = async () => {
            const {
              swipeBotLevel,
              openSwipeBot,
              swipeBotSpeedValue,
              coinPoolTotalCount,
            } = boosts_info;
            const { coinPoolRecoverySpeed } = gameInfo;
            let sleepTime =
              Math.floor(coinPoolTotalCount / coinPoolRecoverySpeed) * 1000;
            try {
              if (swipeBotLevel < 1) {
                await claim(secret, access_token);
                return;
              } else {
                // sleepTime *= 2;
              }
            } finally {
              // wait more than 3 times if having yespac
              setWaitTime(sleepTime * 3);
            }
            if (!openSwipeBot) {
              // open swipe bot
              secret.log(`Bật yespac`);
              await turnOnYespac(secret, access_token);
            }
            const bonus = await getYespacBonus(secret, access_token);
            if (bonus) {
              const { collectAmount, collectStatus, transactionId } = bonus;
              if (collectStatus) {
                let address;
                const addressList = await getWallet(secret, access_token);
                address = addressList?.[0]?.friendlyAddress;
                secret.log(
                  `Claim yespac với id ${transactionId} và address ${address}!`
                );
                await claimYespacBonus(
                  secret,
                  access_token,
                  address,
                  transactionId
                );
                secret.log(`Đã claim ${collectAmount} bằng yespac!`);
              }
            }
            await claim(secret, access_token);
            await offline(secret, access_token);
          };
          await claimFn();

          // daily applyEnergyBoost
          while (boosts_info.coinPoolLeftRecoveryCount > 0) {
            await applyEnergyBoost(secret, access_token);
            await claimFn();
            boosts_info.coinPoolLeftRecoveryCount--;
          }

          //apply_daily_turbo
          if (boosts_info.specialBoxLeftRecoveryCount > 0) {
            await applyTurboBoost(secret, access_token);
            await sendTapsWithTurbo(secret, access_token);
          }
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              if (isDone(checkTasksKey(id))) break;
              const signInTasks = await getSignInTasks(secret, access_token);
              const todayTask = signInTasks.find(
                ({ openIn, status }) => openIn == 0 && status == 1
              );
              if (todayTask) {
                const { id, name, checkIn } = todayTask;
                if (checkIn == 0) {
                  let address;
                  const addressList = await getWallet(secret, access_token);
                  address = addressList?.[0]?.friendlyAddress;
                  secret.log(`Get daily post`);
                  await getDailyPost(secret, access_token);
                  secret.log(`Điểm danh cho ngày ${name}`);
                  const { data, code, message } = await claimSignInTask(
                    secret,
                    access_token,
                    address,
                    id
                  );
                  if (code == 0) {
                    const { reward, status } = data;
                    secret.log(
                      `Điểm danh cho ngày ${name} thành công! +${reward} Gold`
                    );
                  } else throw new Error(message);
                }
              }
              secret.log(`Kiểm tra nhiệm vụ`);
              const tasks = await getTaskList(secret, access_token);
              for (const task of tasks) {
                let { taskStatus, taskId, reward, name, checkStatus } = task;
                if (taskStatus == 0 && checkStatus == 0) {
                  // start
                  secret.log(`Start task ${name}`);
                  await clickTask(secret, access_token, taskId);
                  checkStatus = 2;
                  secret.log(`Start task ${name} SUCCESS!`);
                }
                if (checkStatus == 2) {
                  // check
                  secret.log(`Check task ${name}`);
                  const success = await checkTask(secret, access_token, taskId);
                  if (success) {
                    checkStatus = 1;
                    secret.log(`Check task ${name} SUCCESS!`);
                  }
                }
                if (taskStatus == 0 && checkStatus == 1) {
                  // start
                  secret.log(`Claim task ${name}`);
                  await claimTaskReward(secret, access_token, taskId);
                  secret.log(`Claim task ${name} SUCCESS! +${reward} Gold`);
                }
              }
              secret.log(`Kiểm tra nhiệm vụ hằng ngày (${retry})`);
              let retryDaily = 0;
              while (retryDaily < MAX_RETRY) {
                retryDaily++;
                const dailyTasks = await getDailyTasks(secret, access_token);
                for (const dailyTask of dailyTasks) {
                  let { missionStatus, missionId, reward, name, checkStatus } =
                    dailyTask;
                  if (missionStatus == 0 && checkStatus == 0) {
                    // start
                    secret.log(`Start daily task ${name}`);
                    await clickDailyTask(secret, access_token, missionId);
                    checkStatus = 2;
                    secret.log(`Start daily task ${name} SUCCESS!`);
                  }
                  if (checkStatus == 2) {
                    // check
                    secret.log(`Check daily task ${name}`);
                    const success = await checkDailyTask(
                      secret,
                      access_token,
                      missionId
                    );
                    if (success) {
                      checkStatus = 1;
                      secret.log(`Check daily task ${name} SUCCESS!`);
                    }
                  }
                  if (missionStatus == 0 && checkStatus == 1) {
                    // start
                    secret.log(`Claim daily task ${name}`);
                    const success = await claimDailyTaskReward(
                      secret,
                      access_token,
                      missionId
                    );
                    if (success) {
                      secret.log(
                        `Claim daily task ${name} SUCCESS! +${reward} Gold`
                      );
                    }
                  }
                }
              }
              secret.log(`Kiểm tra bonus (${retry})`);
              const {
                dailyTaskFinishCount,
                dailyTaskTotalCount,
                dailyTaskFinishBonus,
                dailyTaskBonusStatus,
                commonTaskFinishCount,
                commonTaskTotalCount,
                commonTaskBonusStatus,
                commonTaskFinishBonus,
              } = await getTaskBonus(secret, access_token);
              if (
                commonTaskBonusStatus < 2 &&
                commonTaskTotalCount <= commonTaskFinishCount
              ) {
                secret.log(`Claim common task bonus`);
                await claimCommonTaskBonus(secret, access_token);
                secret.log(
                  `Claim common task bonus SUCCESS! +${commonTaskFinishBonus} Gold`
                );
              }
              if (
                dailyTaskBonusStatus < 2 &&
                dailyTaskTotalCount <= dailyTaskFinishCount
              ) {
                secret.log(`Claim daily task bonus`);
                await claimDailyTaskBonus(secret, access_token);
                secret.log(
                  `Claim daily task bonus SUCCESS! +${dailyTaskFinishBonus} Gold`
                );
              }
              setDone(checkTasksKey(id));
              break;
            } catch (e) {
              secret.error(e);
            }
          }
          const { totalAmount, rank, inviteAmount, levelInfo } =
            await getAccountInfo(secret, access_token);
          secret.log(
            `Amount: ${totalAmount}, Rank: ${rank}, Level: ${levelInfo.level}, Invite amount: ${inviteAmount}`
          );
        }
      });
    } catch (e) {
      secret.error(e);
      waitTime = 10000;
      if (e?.response?.status == 429) {
        waitTime = randomInt(5, 20) * 60_000;
      } else if (e?.message == "invalid code error") {
        secret.log("Token đã hết hạn, thoát game");
        waitTime = 0;
        return;
      }
    } finally {
      if (waitTime == DEFAULT_TIME) {
        waitTime = 60_000; // 60s
      }
      if (waitTime > 0) {
        secret.log(`Ngủ ${(waitTime / (60 * 1000)).toFixed(0)} phút... `);
      }
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
};
