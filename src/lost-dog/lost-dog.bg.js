import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { randomInt } from "../../utils/helper.js";
import {
  getDailyGift,
  getHomePage,
  login,
  lostDogsWayVote,
  saveEvent,
} from "../../utils/lost-dog.js";

const { exec } = newSemaphore(30);

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-lost-dog-${fileName}`, async (event) => {
    event.sender.send(
      `${fileName}-console`,
      `start-claim-lost-dog-${fileName}`
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
    let sleepTime = 4 * 60 * 60 * 1000;
    try {
      await exec(async () => {
        let value = await randomInt(1, 3);
        const userInfo = await login(secret);
        const items = await getDailyGift(secret);
        if (items) {
          secret.log(
            `Đã nhận quà hằng ngày: ${items
              .map(({ description }) => description)
              .join(", ")}`
          );
        }
        await saveEvent(secret);

        const woofBalanceDivided = parseFloat(userInfo?.woofBalance) / 1e9;
        secret.log(
          `WOOF=${woofBalanceDivided}, BONES=${userInfo?.gameDogsBalance}`
        );

        if (!userInfo?.currentRoundVote) {
          secret.log(`Chọn thẻ số ${value}`);
          const newVote = await lostDogsWayVote(secret, value);
          secret.log(
            `Đã bình chọn thẻ ${newVote?.selectedRoundCardValue} cho ${newVote?.id} (${newVote?.spentGameDogsCount} BONES)`
          );
        }
        const {gameState} = await getHomePage(secret);
        const roundEndsAt = new Date(gameState.roundEndsAt * 1000);
        // const gameEndsAt = new Date(gameState.gameEndsAt * 1000);
        sleepTime = roundEndsAt - new Date() + 30 * 60 * 1000;
      });
    } catch (e) {
      if (["auth outdated", "auth invalid"].includes(e.message)) {
        sleepTime = 0;
        secret.log("token đã hết hạn");
        return;
      }
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
