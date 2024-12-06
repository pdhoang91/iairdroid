import {
  buyUpgrades,
  getDailyCombo,
  getHamsterSync,
} from "../../utils/hamster.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress, getHamsterAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const MAX_EARN_PER_HOUR = 1000;
const CEIL_PRICES = [10000];

const main = async () => {
  const secrets = await getAllHamsterAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          while (true) {
            try {
              const { earnPassivePerHour } = await getHamsterSync(secret);
              if (earnPassivePerHour > MAX_EARN_PER_HOUR) return;
              for (const ceilPrice of CEIL_PRICES) {
                await buyUpgrades(secret, ceilPrice);
              }
              return
            } catch (e) {
              secret.error(e);
            }
          }
        })
    )
  );
};

main();
