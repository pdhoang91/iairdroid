import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getFreeSpinTicket, getSpin, isDailySpinClaimed, login, openSpinTicket } from "../../utils/ocean.js";
import { claimReward, getAccountClaimHour, getAccountLevelAndMultiple, getLatestClaimTx } from "../../utils/balance-ocean.js";
import { suiExec as reqExec } from "../common/common.bg.js";
const { exec } = newSemaphore(10);
const MIN_MESH = 4;
const MIN_BOAT = 6;
const CLAIM_DAILY_SPIN = false;

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-ocean-${fileName}`, async (event) => {
    event.sender.send(`${fileName}-console`, `start-claim-ocean-${fileName}`);

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
  let done = false
  while (!done) {
    let sleepTime = 24 * 60 * 60 * 1000;
    const setSleepTime = (time) => {
      if (time < sleepTime) sleepTime = time;
    };
    try {
      await exec(async () => {
        const { level: mesh, boat, exist } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
        if (!exist) {
          done = true;
          setSleepTime(0);
          secret.log(`Tài khoản chưa được khởi tạo, thoát game.`)
          return
        }
        if (mesh < MIN_MESH || boat < MIN_BOAT) {
          done = true;
          setSleepTime(0);
          secret.log(`Tài khoản chưa đủ level để chạy, yêu cầu mèo lv ${MIN_MESH}, thuyền lv ${MIN_BOAT}, thoát game.`)
          return;
        }
        if (CLAIM_DAILY_SPIN) {
          await login(secret);
          const dailySpinClaimed = await isDailySpinClaimed(secret);
          if (!dailySpinClaimed) {
            secret.log(`Lấy vé quay số free hàng ngày`)
            await getFreeSpinTicket(secret);
          }
          const { buy_quantity, open_quantity } = await getSpin(secret);
          let currentTicket = (buy_quantity || 0) - (open_quantity || 0);
          secret.log(`Có ${currentTicket} vé`);
          while (currentTicket > 0) {
            const [{ item, amount }] = await openSpinTicket(secret)
            secret.log(`Mở 1 vé, nhận được phần thưởng ${amount} ${item?.name}!`)
            currentTicket--;
          }
        }
        let latestClaim = await reqExec(
          () => getLatestClaimTx(secret.address),
          1.5
        );
        if (latestClaim) {
          let nextTime = new Date(latestClaim);
          const claimHour = await reqExec(() => getAccountClaimHour(secret.address), 1.5);
          nextTime.setHours(nextTime.getHours() + claimHour);
          nextTime -= new Date();
          if (nextTime < 0) {
            try {
              secret.log(`Điểm danh cho địa chỉ ${secret.address}...`);
              const response = await reqExec(() => claimReward(secret), 0.5);
              if (response?.effects?.status?.status != "success") {
                throw new Error(
                  response?.effects?.status?.error ||
                  `Giao dịch thất bại, lỗi: ${JSON.stringify(response)}`
                );
              }
              setSleepTime(claimHour * 60 * 60000); // claim after nh
            } catch (e) {
              secret.error(e);
              setSleepTime(30_000) // claim after 30s
            }
          } else {
            setSleepTime(nextTime);
          }
        }
      });
    } catch (e) {
      sleepTime = 30 * 1000;
      secret.error(e);
    } finally {
      if (sleepTime > 0) {
        secret.log(`Ngủ ${(sleepTime / (1000 * 60)).toFixed(1)} phút...`);
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
};
