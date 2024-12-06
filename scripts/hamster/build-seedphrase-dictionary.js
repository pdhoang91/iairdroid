import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";
import { loadHamsterDictionary } from "../../utils/seedphrase-dictionary.js";
import { parseTgUserId } from "../../utils/hamster.js";

const { exec } = newSemaphore(10);
const PRINT_DICT = false;
const main = async () => {
  let secrets = await getAllHamsterAddress();
  const { print, set, save } = loadHamsterDictionary();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            try {
              if (!secret.receiveAddress) {
                secret.log("Missing seedphrase");
                return;
              }
              const id = parseTgUserId(secret);
              secret.log(`Set seedphrase for user ${id}`);
              set(id, secret.receiveAddress);
            } catch (e) {
              // console.error(e);
              secret.error(`ERROR: ${e?.message || e}`);
            }
          }
        })
    )
  );
  save();
  if (PRINT_DICT) {
    print();
  }
};

main();
