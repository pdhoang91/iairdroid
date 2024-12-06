import { upgradePetIfNeeded } from "../../utils/pixelVerse.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPixelVerseAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(5);
const maxLevel = 30;

const main = async () => {
  const secrets = await getAllPixelVerseAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          try {
            await upgradePetIfNeeded(secret, maxLevel);
          } catch (e) {
            console.log(`${secret.id} Lỗi: ${e.message}`);
          }
        })
    )
  );
};
main();
