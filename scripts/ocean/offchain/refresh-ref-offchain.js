import { getAccountLevelAndMultiple } from "../../../utils/balance-ocean.js";
import { sleep } from "../../../utils/helper.js";
import { login, updateRefferal } from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(2);

const main = async () => {
  const secrets = await getAllOceanAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                const { referral, exist } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
                if (!exist) return
                await login(secret);
                secret.log(`Update referral to address ${referral} offchain`);
                await updateRefferal(secret, referral);
                secret.log(`Update referral to address ${referral} offchain SUCCESS!`);
                return;
              } catch (e) {
                console.error(e);
                // secret.error(e);
                secret.log(`ERROR: ${e?.message}`);
                await sleep(5);
              }
            }
          }
        })
    )
  );
};

main();
