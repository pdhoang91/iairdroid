import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import {
  claimFarming,
  getFarming,
  login,
  register,
  startFarming,
  tap,
} from "../../utils/memelandtg.js";
import { randomInt } from "../../utils/helper.js";

const { exec } = newSemaphore(100);

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-memelandtg-${fileName}`, async (event) => {
    event.sender.send(
      `${fileName}-console`,
      `start-claim-memelandtg-${fileName}`
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
          // console.log("err: " + JSON.stringify(e?.response?.data?.detail?.[0]))
          const msg =
            e?.response?.data?.detail?.[0]?.msg ||
            e?.data?.detail ||
            e?.message ||
            JSON.stringify(e);
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${
              e?.status ? `(status=${e?.status})` : ""
            }: ${msg}`
          );
          console.error(msg);
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
    const setSleepTime = (time) =>
      (sleepTime = time < sleepTime ? time : sleepTime);
    try {
      await exec(async () => {
        const accessToken = await login(secret);
        await register(secret, accessToken);
        const { endTime, crypto, balance } = await getFarming(
          secret,
          accessToken
        );
        let endDate = endTime ? new Date(endTime * 1000) : null;
        if (endDate && endDate <= new Date()) {
          secret.log(`Nhận ${balance} ${crypto}`);
          await claimFarming(secret, accessToken);
          endDate = null;
        }
        if (!endDate) {
          secret.log(`Bắt đầu farm`);
          await startFarming(secret, accessToken);
          const newFarmData = await getFarming(secret, accessToken);
          endDate = newFarmData.endDate;
        }
        setSleepTime(endDate - new Date());
        let repeatTime = randomInt(25, 40), i = 0;
        while (i < repeatTime) {
          i++;
          let energy = 1000;
          while (energy > 0) {
            let tapTime = 1000, coinName = "doge";
            secret.log(`Tap ${coinName} ${tapTime} lần (${i}/${repeatTime})`);
            const data = await tap(secret, accessToken, coinName, tapTime);
            secret.log(`Có ${data[coinName]} ${coinName} (${i}/${repeatTime})`);
            energy -= tapTime;
          }
          const waitTime = randomInt(2, 5);
          secret.log(`Chờ ${waitTime}s rồi tap tiếp`)
          await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
        }
        setSleepTime(randomInt(10, 15) * 60 * 1000);
      });
    } catch (e) {
      sleepTime = 10_000;
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
