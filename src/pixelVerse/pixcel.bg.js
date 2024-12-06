import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import moment from "moment";

import {
  getProgress,
  claimBalance,
  checkDailyRewards,
} from "../../utils/pixelVerse.js";

const { exec } = newSemaphore(5);

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-pixelVerse-${fileName}`, async (event) => {
    event.sender.send(
      `${fileName}-console`,
      `start-claim-pixelVerse-${fileName}`
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
        await Promise.all([startClaim(secret), dailyReward(secret)]);
      })
    );
  });
};

const startClaim = async (secret) => {
  // get progress
  // get token can claim
  // check if token can claim is greater 0, then claim
  let claimed = false;
  let error = false;
  while (true) {
    try {
      const cekProgress = await exec(() => getProgress(secret));
      if (cekProgress) {
        const data = cekProgress;
        const maxCoin = data.maxAvailable.toLocaleString("id-ID");
        const canClaim = data.currentlyAvailable.toLocaleString("id-ID");
        const minClaim = data.minAmountForClaim.toLocaleString("id-ID");
        const fullClaim = moment(data.nextFullRestorationDate).format(
          "H [giờ] m [phút]"
        );
        const restoreSpeed = data.restorationPeriodMs;

        const unixFullClaim = moment(data.nextFullRestorationDate).unix();
        const now = moment().unix();
        // SpaceOfNextRunTime = (unixFullClaim - now) * 1000;
        // secret.log(`[ Progress ] : Max Claim: ${maxCoin} | Min Claim: ${minClaim}`);
        // secret.log(`[ Progress ] : Có thể Claim: ${canClaim} | Full Claim: ${fullClaim}`);
        // secret.log(`[ Progress ] : Khôi phục tốc độ: ${restoreSpeed}`);

        // secret.log(`[ Claim ] : Bắt đầu claim...`);

        secret.log("[ Claim ] : Đang claim");
        const claim = await exec(() => claimBalance(secret));
        if (claim) {
          const claimedAmount = claim.claimedAmount || 0;
          const amount = claimedAmount.toLocaleString("id-ID");
          secret.log(`[ Claim ] : Claim thành công ${amount}`);
          claimed = true;
        } else {
          error = true;
          secret.error(`[ Claim ] : Thất bại`);
        }
      }
    } catch (e) {
      secret.error(e);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      if (claimed == true) {
        claimed = false;
        secret.log(`Vừa claim xong. Khởi chạy trở lại sau 8 giờ 10 phút.`);
        await new Promise((resolve) =>
          setTimeout(resolve, 8 * 60 * 60 * 1000 + 10 * 60 * 1000)
        );
      } else {
        if (error == true) {
          error = false;
          secret.log(`Claim thất bại. Khởi chạy trở lại sau 30 phút.`);
          await new Promise((resolve) => setTimeout(resolve, 30 * 60 * 1000));
          continue;
        }
      }
    }
  }
};

const dailyReward = async (secret) => {
  let claimed = false;
  let err = false;
  while (true) {
    try {
      claimed = await exec(() => checkDailyRewards(secret));
    } catch (e) {
      secret.error(e);
      err = true;
    } finally {
      if (claimed == true) {
        claimed = false;
        secret.log(
          `[Daily Reward] Vừa claim xong. Khởi chạy trở lại sau 24 giờ`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 24 * 60 * 60 * 1000)
        );
      } else {
        if (err == true) {
          err = false;
          secret.log(`Lỗi, sẽ khởi chạy trở lại sau 30 phút`);
          await new Promise((resolve) => setTimeout(resolve, 30 * 60 * 1000));
        } else {
          secret.log(
            `[Daily Reward] Chưa đủ thời gian nhận, sẽ khởi chạy trở lại sau 6h`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 6 * 60 * 60 * 1000)
          );
        }
      }
    }
  }
};
