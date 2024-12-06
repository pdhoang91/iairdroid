import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import {
  claimSpellBatchMode,
  getSpellUser,
  isSpellClaimable,
  newSpellClientWithProxy,
  waitUntilTaskDone,
} from "../../utils/spell.js";
import { newSemaphore } from "../../utils/semaphore.js";

const { exec } = newSemaphore(5);

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-spell-${fileName}`, async (event) => {
    const secrets = await getSecretsByFileName(fileName);
    await Promise.all(
      secrets.map(async (secret) => {
        secret = { ...secret };
        secret.log = (msg) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} ${msg}`
          );
          console.log(msg);
        };
        secret.error = (e) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${
              e?.status ? ` (status=${e?.status})` : ""
            }: ${e?.message || e?.data?.message || JSON.stringify(e)}`
          );
          console.error(e);
        };
        secret.client = newSpellClientWithProxy(secret.proxy, secret.log);
        await claimRewardWithPool(secret);
      })
    );
    while (true) {
      await new Promise((resolve) => setTimeout(() => resolve(), 1000000));
    }
  });
};
const claimRewardWithPoolAfter = (sender, timeout) => {
  sender.log(
    `Đặt lịch điểm danh sau ${(timeout / (1000 * 60)).toFixed(0)} phút`
  );
  setTimeout(() => claimRewardWithPool(sender), timeout + 1000);
};

const claimRewardWithPool = async (sender) => {
  return await exec(async () => await claim(sender));
};

const claim = async (sender) => {
  try {
    const user = await getSpellUser(sender);
    let { claimable, timeToFullCapacity } = await isSpellClaimable(sender);
    if (claimable) {
      sender.log(`Điểm danh cho địa chỉ ${user.address}...`);
      await claimSpellBatchMode(sender);
      let newData = await isSpellClaimable(sender);
      timeToFullCapacity = newData.timeToFullCapacity;
    }
    claimRewardWithPoolAfter(sender, timeToFullCapacity);
  } catch (e) {
    sender.error(e);
    claimRewardWithPoolAfter(sender, 60000); // claim after 60s
  }
};
