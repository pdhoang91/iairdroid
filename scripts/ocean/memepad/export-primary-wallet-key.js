import {
  JSONStringtify,
  parseTgUserFromInitParams,
  sleep,
} from "../../../utils/helper.js";
import {
  exportPrimaryWalletKey,
  getPrimaryWallet,
  loginMemeCulture,
} from "../../../utils/ocean.js";
import { loadOceanMemepadDictionary } from "../../../utils/seedphrase-dictionary.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(100);
const PRINT_DICT = false;

const main = async () => {
  const secrets = await getAllOceanAddress();
  const {print, set, save} = loadOceanMemepadDictionary()
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                if (!secret.initParams) return;
                const { id } = parseTgUserFromInitParams(secret.initParams);
                await loginMemeCulture(secret);
                const primaryWallet = await getPrimaryWallet(secret);
                if (!primaryWallet) {
                  secret.log("Not found primary wallet");
                  return;
                }
                secret.log(
                  `Fetching secret key for primary wallet ${primaryWallet.address}`
                );
                const { private_key } = await exportPrimaryWalletKey(
                  secret,
                  primaryWallet.address
                );
                if (!private_key || !private_key?.startsWith("suiprivkey")) {
                  throw new Error(`Wrong seedphrase, found ${private_key}`)
                }
                secret.log(`Set seedphrase for user ${id}`);
                set(id, private_key);
                return;
              } catch (e) {
                if (e?.response?.status == 401) return;
                // console.error(e);
                // secret.error(e);
                secret.log(
                  `ERROR: ${
                    JSONStringtify(e?.response?.data?.message) || e?.message
                  }`
                );
                await sleep(1);
              }
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
