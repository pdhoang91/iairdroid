import {
  getAccountLevelAndMultiple,
} from "../../../utils/balance-ocean.js";
import { sleep } from "../../../utils/helper.js";
import {
  claimFirstTime,
  isClaimedFirstTime,
  login,
} from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(20);
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
                await login(secret);
                const { exist } = await reqExec(
                  () => getAccountLevelAndMultiple(secret.address),
                  1.5
                );
                const isClaimed = await isClaimedFirstTime(secret);
                if (exist) {
                  if (!isClaimed) {
                    secret.log(
                      `Address ${secret.address} already binded to another tg account`
                    );
                  }
                  return;
                } else {
                  if (isClaimed) {
                    secret.log(
                      `This tg account already bind with another address`
                    );
                    return;
                  }
                }
                let retry = 0;
                while (true) {
                  retry++;
                  try {
                    secret.log(`Bind tg account with address ${secret.address} (${retry})`);
                    await claimFirstTime(secret);
                    secret.log(
                      `Bind tg account with address ${secret.address} (${retry}) SUCCESS!`
                    );
                    return;
                  } catch (e) {
                    // console.error(e);
                    const msg = e?.response?.data?.message || e?.message;
                    if (["Your account has claimed by another address!", "Not time to claim yet."].includes(msg)) {
                      secret.log(msg);
                      return
                    }
                    secret.log(`ERROR WHEN BINDING ACCOUNT: ${msg}`);
                    await sleep(5);
                  }
                }
              } catch (e) {
                // console.error(e);
                // secret.error(e);
                secret.log(`ERROR: ${e?.response?.data?.message || e?.message}`);
                await sleep(5);
              }
            }
          }
        })
    )
  );
};

main();
