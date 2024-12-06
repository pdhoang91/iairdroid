import { claimDailyCombo } from "../../utils/pixelVerse.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPixelVerseAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(5);
const inputOrder = [11,4,12,17];

const main = async () => {
  const secrets = await getAllPixelVerseAddress();
  while (secrets.length > 0) {
    const secret = secrets.shift();
    try {
      await exec(async () => await claimDailyCombo(secret, inputOrder));
    } catch (e) {
      if (e.message.includes("429")) {
        secrets.push(secret);
        console.log(`${secret.id} retrying...`);
      }else {
      console.log(`${secret.id} Lỗi: ${e.message}`);
    }
    }
  }
};
main();
