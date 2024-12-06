import {
  buyBoostTap,
} from "../../utils/hamster.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllHamsterAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          const ceilPrices = [
            2100, 4100, 8100, 16_100, 32_100, 64_100, 128_100, 256_100,
          ];
          for (const ceilPrice of ceilPrices) {
            await buyBoostTap(secret, ceilPrice);
          }
        })
    )
  );
};

main();
