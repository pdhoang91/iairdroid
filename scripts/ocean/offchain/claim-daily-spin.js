import { seedphases } from "../../../config/secret.js";
import {
  getAccountLevelAndMultiple,
} from "../../../utils/balance-ocean.js";
import { sleep } from "../../../utils/helper.js";
import { getFreeSpinTicket, getSpin, isDailySpinClaimed, login, openSpinTicket } from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress, getDerivativeAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(50);
const { exec: reqExec } = newSemaphore(15);
const INCLUDE_FARM_ACCOUNT = true;

const main = async () => {
  let secrets = await getAllOceanAddress();
  if (!INCLUDE_FARM_ACCOUNT) secrets = [];
  secrets.forEach(async (secret) => {
    while (true) {
      try {
        const {
          exist,
        } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
        if (!exist) return;
        await claimRewardWithPool(secret);
        return
      } catch (e) {
        secret.error(e);
        await sleep(1);
      }
    }
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
              exist,
            } = await reqExec(
              () => getAccountLevelAndMultiple(sender.address),
              1.5
            );
            if (!exist) return;
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
    await login(sender);
    const dailySpinClaimed = await isDailySpinClaimed(sender);
    if (!dailySpinClaimed) {
      sender.log(`Get daily spin`)
      await getFreeSpinTicket(sender);
    }
    const { buy_quantity, open_quantity } = await getSpin(sender);
    let currentTicket = buy_quantity - open_quantity;
    sender.log(`Having ${currentTicket} ticket`);
    while (currentTicket > 0) {
      const [{ item, amount }] = await openSpinTicket(sender)
      sender.log(`Open 1 ticket, received ${amount} ${item?.name} reward!`)
      currentTicket--;
    }
    claimRewardWithPoolAfter(sender, 12 * 60 * 60000); // claim after 12h
  } catch (e) {
    // console.error(e);
    claimRewardWithPoolAfter(sender, 2 * 60000); // claim after 2m
    sender.error(e);
  }
};

main();
