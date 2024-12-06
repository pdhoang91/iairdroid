import { newSemaphore } from "../../utils/semaphore.js";
import { getAllLostDogAddress } from "../../utils/wallet.js";
import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { loadLostdogsDictionary } from "../../utils/seedphrase-dictionary.js";

const { exec } = newSemaphore(10);
const PRINT_DICT = false;
const main = async () => {
  let secrets = await getAllLostDogAddress();
  const { print, set, save } = loadLostdogsDictionary();
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
              const { id } = parseTgUserFromInitParams(secret.privateKey);
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
