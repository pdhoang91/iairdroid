import { claimDailyCipher, decodeCipher, getDailyCipher } from "../../utils/hamster.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";
// import morsejs from "booleanmorse"

const { exec } = newSemaphore(30);

const main = async () => {
  const secrets = await getAllHamsterAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          try {
            const {isClaimed, cipher} = await getDailyCipher(secret)
            if (isClaimed) return
            const decoded = decodeCipher(cipher);
            await claimDailyCipher(secret, decoded);
            console.log(`${secret.id} Claim daily cipher (${decoded}) thành công`);
          } catch (e) {
            console.log(`${secret.id} Lỗi: ${e.message}`);
          }
        })
    )
  );
};

main();
