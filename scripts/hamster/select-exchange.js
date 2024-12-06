import { getHamsterSync, selectExchange } from "../../utils/hamster.js";
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
            const sync = await getHamsterSync(secret);
            const { exchangeId } = sync;
            if (exchangeId) return
            await selectExchange(secret);
            console.log(`${secret.id} Select exchange thành công`);
          } catch (e) {
            console.log(`${secret.id} Lỗi: ${e.message}`);
          }
        })
    )
  );
};

main();
