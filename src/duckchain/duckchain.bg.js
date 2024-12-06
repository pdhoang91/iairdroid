import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import {
  getCardInfo,
  getTaskList,
  getUserInfo,
  login,
  getDoneTasks,
  dailyCheckin,
  finishTask,
  isClaimedEgg,
  claimEgg,
} from "../../utils/duckchain.js";
import {
  isDone,
  parseTgUserFromInitParams,
  setDone,
} from "../../utils/helper.js";

const { exec } = newSemaphore(100);
const checkTasksKey = (id) => `duckchain_checkTasks_${id}`;
const CLAIM_EGG = false;

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-duckchain-${fileName}`, async (event) => {
    event.sender.send(
      `${fileName}-console`,
      `start-claim-duckchain-${fileName}`
    );

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

const startClaim = async (secret) => {
  while (true) {
    let sleepTime = 6 * 60 * 60_000;
    try {
      const { id } = parseTgUserFromInitParams(secret.privateKey);
      await exec(async () => {
        await login(secret);
        const { profession } = await getCardInfo(secret);
        const userInfo = await getUserInfo(secret);
        secret.log(
          `Có ${userInfo.boxAmount} box, có ${userInfo.decibels} DUCK (nghề nghiệp ${profession})`
        );
        if (!isDone(checkTasksKey(id))) {
          if (CLAIM_EGG) {
            const claimed = await isClaimedEgg(secret)
            if (!claimed) {
              secret.log("Claim 10 egg");
              const success = await claimEgg(secret);
              if (success) {
                secret.log("Claim 10 egg SUCCESS!");
              } else {
                secret.log("Claim 10 egg FAIL!");
              }
            }
          }
          const taskMap = await getTaskList(secret);
          const doneTasksMap = await getDoneTasks(secret);
          for (const categoryType of Object.keys(taskMap)) {
            const taskList = taskMap[categoryType];
            const doneTasks = doneTasksMap[categoryType];
            const notDoneTasks = taskList.filter(
              ({ taskId }) => !doneTasks.includes(taskId)
            );
            if (!notDoneTasks) continue;
            secret.log(
              `Found ${notDoneTasks.length} not done ${categoryType} tasks`
            );
            for (const task of notDoneTasks) {
              const {
                taskId,
                content,
                action,
                integral,
                icon_url,
                type,
                taskType,
              } = task;
              if (taskType == "daily_check_in") {
                secret.log("Checkin daily");
                const success = await dailyCheckin(secret);
                if (success) {
                  secret.log(`Checkin daily success! + ${integral} DUCK`);
                } else {
                  secret.log(`Checkin daily fail!`);
                }
                continue;
              }
              if (action?.includes?.("t.me")) continue
              secret.log(`Finish task ${content} (${categoryType})`);
              const success = await finishTask(secret, categoryType, taskId);
              if (success) {
                secret.log(
                  `Finish task ${content} (${categoryType}) SUCCESS! +${integral} DUCK`
                );
              }
            }
          }
          setDone(checkTasksKey(id), 12 * 60 * 60_000);
        }
      });
    } catch (e) {
      sleepTime = 60_000;
      secret.error(e);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    } finally {
      if (sleepTime > 0) {
        secret.log(`Ngủ ${(sleepTime / (1000 * 60)).toFixed(1)} phút...`);
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
};
