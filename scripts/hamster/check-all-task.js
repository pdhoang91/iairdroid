import { checkTasks } from "../../utils/hamster.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllHamsterAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          try {
            await checkTasks(secret)
          } catch (e) {
            console.log(`${secret.id} Lỗi: ${e.message}`);
          }
        })
    )
  );
};

main();
