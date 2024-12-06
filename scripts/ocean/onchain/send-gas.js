import {
  AIRDROP_SUI_PER_ACCOUNT,
  MIN_SUI_PER_ACCOUNT,
  isAccountDied,
} from "../../../config/account.js";
import { seedphases } from "../../../config/secret.js";
import {
  getCurrentOcean,
  getCurrentSui,
  isQualifiedToSendGas,
  sendSui,
} from "../../../utils/balance-ocean.js";
import { sleep } from "../../../utils/helper.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getDerivativeAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(2);
const SLEEP_TIME = 0.1;
const INCLUDE_FIRST_AIRDROP = false;

const main = async () => {
  await Promise.all(
    seedphases.map(async (seedphase) => {
      let { name } = seedphase;
      const defaultAddress = await getDerivativeAddress(name, 0);
      await Promise.all(
        Array.from(Array(99).keys()).map((i) =>
          defaultAddress.exec(async () => {
            if (SLEEP_TIME > 0) {
              await sleep(SLEEP_TIME);
            }
            const secret = await getDerivativeAddress(name, i);
            const { address } = secret;
            if (isAccountDied(address)) {
              return;
            }
            while (true) {
              try {
                let [sui, qualifiedToSendGas] = await Promise.all([
                  exec(() => getCurrentSui(address)),
                  exec(
                    () =>
                      isQualifiedToSendGas(address, true, INCLUDE_FIRST_AIRDROP),
                    2
                  ),
                ]);
                if (!qualifiedToSendGas) return;
                if (sui <= MIN_SUI_PER_ACCOUNT) {
                  // send gas
                  secret.log(
                    `Sending gas to address (${address}) SUI=${sui}`
                  );
                  try {
                    const response = await exec(
                      () =>
                        sendSui(defaultAddress, address, AIRDROP_SUI_PER_ACCOUNT),
                      0.5
                    );
                    if (response.effects.status.status != "success") {
                      throw new Error(
                        response?.effects?.status?.error ||
                        `Sending fail, response: ${JSON.stringify(response)}`
                      );
                    }
                  } catch (e) {
                    secret.error(e);
                  }
                } else {
                  secret.log(`Enough gas, having ${sui.toFixed(3)} SUI`);
                }
                return
              } catch (e) {
                secret.log(`ERROR: ${e?.message}`)
                await sleep(1);
              }
            }
          })
        )
      );
    })
  );
};
main();
