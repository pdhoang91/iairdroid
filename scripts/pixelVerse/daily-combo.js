import { claimDailyCombo } from "../../utils/pixelVerse.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPixelVerseAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(5);
const inputOrder = [9,1,5,6];

const main = async () => {
  const secrets = await getAllPixelVerseAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          try {
            const result = await claimDailyCombo(secret, inputOrder);
            if (result) {
              console.log(`${secret.id} Claim daily combo thành công`);
            }
          } catch (e) {
            console.log(`${secret.id} Lỗi: ${e.message}`);
          }
        })
    )
  );
};

main();
