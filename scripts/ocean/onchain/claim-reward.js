import { seedphases } from "../../../config/secret.js";
import {
  claimReward,
  getAccountClaimHour,
  getAccountLevelAndMultiple,
  getLatestClaimTx,
} from "../../../utils/balance-ocean.js";
import { sleep } from "../../../utils/helper.js";
import { getFreeSpinTicket, getSpin, isDailySpinClaimed, login, openSpinTicket } from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress, getDerivativeAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(2);
const MIN_MESH = 4;
const MIN_BOAT = 6;
const INCLUDE_FARM_ACCOUNT = true;
const GET_DAILY_SPIN = false;

const main = async () => {
  let secrets = await getAllOceanAddress();
  if (!INCLUDE_FARM_ACCOUNT) secrets = [];
  secrets.forEach(async (secret) => {
    const {
      level: mesh,
      boat,
      exist,
    } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
    if (!exist) return;
    if (mesh < MIN_MESH) return;
    if (boat < MIN_BOAT) return;
    await claimRewardWithPool(secret);
  });
  seedphases.forEach(async (seedphase, x) => {
    let { name } = seedphases[x];
    await Promise.all(
      Array.from(Array(99).keys()).map(async (i) => {
        if (i == 0) return;
        const sender = await getDerivativeAddress(name, i);
        while (true) {
          try {
            const {
              level: mesh,
              boat,
              exist,
            } = await reqExec(
              () => getAccountLevelAndMultiple(sender.address),
              1.5
            );
            if (!exist) return;
            if (mesh < MIN_MESH) return;
            if (boat < MIN_BOAT) return;
            await claimRewardWithPool(sender);
            return;
          } catch (e) {
            sender.error(e);
            await sleep(1);
          }
        }
      })
    );
  });
  while (true) {
    await new Promise((resolve) => setTimeout(() => resolve(), 1000000));
  }
};

const claimRewardWithPoolAfter = (sender, timeout) => {
  sender.log(
    `Đặt lịch điểm danh sau ${(timeout / (1000 * 60)).toFixed(1)} phút`
  );
  setTimeout(() => claimRewardWithPool(sender), timeout + 1000);
};

const claimRewardWithPool = async (sender) => {
  return await exec(async () => await claim(sender));
};

const claim = async (sender) => {
  try {
    if (GET_DAILY_SPIN) {
      await login(sender);
      const dailySpinClaimed = await isDailySpinClaimed(sender);
      if (!dailySpinClaimed) {
        sender.log(`Get daily spin`)
        await getFreeSpinTicket(sender);
      }
      const { buy_quantity, open_quantity } = await getSpin(sender);
      let currentTicket = (buy_quantity || 0) - (open_quantity || 0);
      sender.log(`Having ${currentTicket} ticket`);
      while (currentTicket > 0) {
        const [{ item }] = await openSpinTicket(sender)
        sender.log(`Open 1 ticket, received ${item?.name} reward!`)
        currentTicket--;
      }
    }
    let latestClaim = await reqExec(
      () => getLatestClaimTx(sender.address),
      1.5
    );
    if (latestClaim) {
      let nextTime = new Date(latestClaim);
      const claimHour = await getAccountClaimHour(sender.address);
      nextTime.setHours(nextTime.getHours() + claimHour);
      nextTime -= new Date();
      if (nextTime < 0) {
        try {
          sender.log(`Claim reward for address ${sender.address}...`);
          const response = await reqExec(() => claimReward(sender), 0.5);
          if (response?.effects?.status?.status != "success") {
            throw new Error(
              response?.effects?.status?.error ||
              `Sending fail, response: ${JSON.stringify(response)}`
            );
          }
          claimRewardWithPoolAfter(sender, claimHour * 60 * 60000); // claim after nh
        } catch (e) {
          console.error(e);
          claimRewardWithPoolAfter(sender, 30000); // claim after 30s
        }
      } else {
        claimRewardWithPoolAfter(sender, nextTime);
      }
    }
  } catch (e) {
    // console.error(e);
    claimRewardWithPoolAfter(sender, 2000); // claim after 2s
    sender.error(e);
  }
};

main();
