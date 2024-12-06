import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getFreeSpinTicket, getSpin, isDailySpinClaimed, login, openSpinTicket } from "../../utils/ocean.js";
import { getAccountLevelAndMultiple } from "../../utils/balance-ocean.js";
import { suiExec as reqExec } from "../common/common.bg.js";

const { exec } = newSemaphore(50);

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-ocean-offchain-${fileName}`, async (event) => {
    event.sender.send(`${fileName}-console`, `start-claim-ocean-offchain-${fileName}`);

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
    let sleepTime = 12 * 60 * 60 * 1000;
    const setSleepTime = (time) => {
      if (time < sleepTime) sleepTime = time;
    };
    try {
      await exec(async () => {
        const { exist } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
        if (!exist) {
          done = true;
          setSleepTime(0);
          secret.log(`Tài khoản chưa được khởi tạo, thoát game.`)
          return
        }
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
