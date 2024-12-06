import { buyUpgrades, getDailyCombo, getHamsterSync } from "../../utils/hamster.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const MIN_REFERRAL_COUNT = 1;
const comboIDs = ["kyc", "staking", "hamster_youtube_gold_button", "licence_bangladesh"]; // "lambo_for_ceo", "partner_announce"
// "kyc"
const main = async () => {
  const secrets = await getAllHamsterAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          const { isClaimed } = await getDailyCombo(secret);
          if (isClaimed) return;
          const { referralsCount } = await getHamsterSync(secret);
          if (referralsCount < MIN_REFERRAL_COUNT) return
          const ceilPrices = [100_000, 200_000, 300_000, 500_000, 900_000, 2000_000, 7500_000];
          for (const ceilPrice of ceilPrices) {
            await buyUpgrades(secret, ceilPrice, comboIDs);
          }
        })
    )
  );
};

main();
