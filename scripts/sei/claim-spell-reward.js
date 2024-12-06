import { isSpellClaimable } from "../../utils/balance-sei.js";
import { claimSpellBatchMode, getSpellUser, waitUntilTaskDone } from "../../utils/spell.js";
import { getAllSpellAddress } from "../../utils/wallet.js";
import exec from "../../utils/worker.js";


const main = async () => {
  const secrets = await getAllSpellAddress()
  await Promise.all(secrets.map(secret => claimRewardWithPool(secret)))
  while (true) {
    await new Promise((resolve) => setTimeout(() => resolve(), 1000000));
  }
};

const claimRewardWithPoolAfter = (sender, timeout) => {
  console.log(
    `>> Đặt lịch điểm danh cho #${sender.id} sau ${(
      timeout /
      (1000 * 60)
    ).toFixed(0)} phút`
  );
  setTimeout(() => claimRewardWithPool(sender), timeout + 1000);
};

const claimRewardWithPool = async (sender) => {
  return await exec(async () => await claim(sender));
};

const claim = async (sender) => {
  const user = await getSpellUser(sender)
  let { claimable, nextClaimTime, timeToFullCapacity } = await isSpellClaimable(user.address);
  if (claimable) {
    try {
      console.log(
        `>> Claim spell reward for account #${sender.id} ${user.address}...`
      );
      await claimSpellBatchMode(sender);
      claimRewardWithPoolAfter(sender, timeToFullCapacity * 1000); // claim after 2h
    } catch (e) {
      console.error(e);
      claimRewardWithPoolAfter(sender, 60000); // claim after 60s
    }
  } else {
    claimRewardWithPoolAfter(sender, nextClaimTime * 1000)
  }
};

main();
