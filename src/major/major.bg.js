import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { JSONStringtify, isDone, randomInt, setDone } from "../../utils/helper.js";
import {
  completeTask,
  getDailyTasks,
  getStreak,
  getTasks,
  getUserInfo,
  holdCoins,
  isHoldCoinAvailable,
  isRouletteAvailable,
  isSwipeCoinAvailable,
  login,
  postVisit,
  spinRoulette,
  swipeCoins,
} from "../../utils/major.js";

const { exec } = newSemaphore(100);
const MAX_RETRY = 3;
const checkTasksKey = (id) => `major_checkTasks_${id}`;

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-major-${fileName}`, async (event) => {
    event.sender.send(`${fileName}-console`, `start-claim-major-${fileName}`);

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
            }: ${JSONStringtify(e?.response?.data?.detail) ||
            e?.data?.message ||
            e?.message ||
            JSON.stringify(e)
            }`
          );
          console.error(e?.response?.data?.detail || e);
        };
        await startClaim(secret);
      })
    );
  });
};

const startClaim = async (secret) => {
  while (true) {
    let sleepTime = 8 * 60 * 60 * 1000;
    const setSleepTime = (time) => {
      if (time < sleepTime) sleepTime = time;
    };
    try {
      await exec(async () => {
        const { user } = await login(secret);
        const { id, first_name } = user;
        const userInfo = await getUserInfo(secret, id);
        if (userInfo) {
          secret.log(`Số sao đang có: ${userInfo.rating}`);
        }

        const streakInfo = await getStreak(secret);
        console.log(
          `Có ${userInfo.rating} sao, đã điểm danh ${streakInfo.streak} ngày`
        );

        const visitResult = await postVisit(secret);
        if (visitResult) {
          if (visitResult.is_increased) {
            secret.log(`Điểm danh thành công ngày ${visitResult.streak}`);
          }
        }

        while (true) {
          const { available, waitTime } = await isRouletteAvailable(secret);
          if (!available) {
            setSleepTime(waitTime)
            break
          }
          secret.log(`Chơi Roulette`);
          const rouletteResult = await spinRoulette(secret);
          if (rouletteResult) {
            if (rouletteResult.rating_award > 0) {
              secret.log(
                `Spin thành công, nhận được ${rouletteResult.rating_award} sao`
              );
            } else if (rouletteResult.detail) {
              secret.log(
                `Spin không thành công, cần mời thêm ${rouletteResult.detail.need_invites} bạn hoặc chờ ngày hôm sau`
              );
            } else {
              secret.log(`Kết quả spin không xác định`);
            }
          }
        }

        while (true) {
          const { available, waitTime } = await isHoldCoinAvailable(secret);
          if (!available) {
            setSleepTime(waitTime)
            break
          }
          secret.log(`Chơi Hold coin`);
          const coins = randomInt(900, 950);
          const { success } = await holdCoins(secret, coins);
          if (success) {
            secret.log(`HOLD coin thành công, nhận ${coins} sao`);
          } else {
            secret.log(`HOLD coin không thành công`);
          }
        }


        while (true) {
          const { available, waitTime } = await isSwipeCoinAvailable(secret);
          if (!available) {
            setSleepTime(waitTime)
            break
          }
          secret.log(`Chơi Swipe coin`);
          const coins = randomInt(2950, 3000);
          const { success } = await swipeCoins(secret, coins);
          if (success) {
            secret.log(`Swipe coin thành công, nhận ${coins} sao`);
          } else {
            secret.log(`Swipe coin không thành công`);
          }
        }
        if (!isDone(checkTasksKey(id))) {
          const dailyTasks = await getDailyTasks(secret);
          const normalTasks = await getTasks(secret);

          const tasks = [...dailyTasks, ...normalTasks].filter(
            ({ is_completed, type }) =>
              !is_completed &&
              ![
                "boost",
                "ton_transaction",
                "boost_channel",
                "stories",
                "code",
              ].includes(type)
          );
          secret.log(`Có ${tasks.length} nhiệm vụ chưa hoàn thành`);

          for (const task of tasks) {
            secret.log(`Làm nhiệm vụ ${task.title} (${task.id})`);
            const { is_completed } = await completeTask(secret, task);
            if (is_completed) {
              secret.log(`Làm nhiệm vụ ${task.title} (${task.id}) thành công!`);
            }
          }
          setDone(checkTasksKey(id), 12 * 60 * 60_000);
        }
      });
    } catch (e) {
      sleepTime = 60 * 1000;
      secret.error(e);
    } finally {
      if (sleepTime > 0) {
        secret.log(`Ngủ ${(sleepTime / (1000 * 60)).toFixed(1)} phút...`);
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
};
