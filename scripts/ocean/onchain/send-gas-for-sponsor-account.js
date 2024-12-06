import {
  MIN_SUI_PER_SPONSOR_ACCOUNT,
  SPONSOR_SUI_PER_ACCOUNT,
} from "../../../config/account.js";
import {
  getCurrentSui,
  isQualifiedToSendGas,
  sendSui,
} from "../../../utils/balance-ocean.js";
import { getAllOceanAddress, getDefaultAddress } from "../../../utils/wallet.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { sleep } from "../../../utils/helper.js";

const { exec } = newSemaphore(20);
const SLEEP_TIME = 0.1;
const INCLUDE_FIRST_AIRDROP = false;

const main = async () => {
  const secrets = await getAllOceanAddress();
  const defaultAddress = await getDefaultAddress("wave-wallet-c");
  for (const sender of secrets) {
    if (SLEEP_TIME > 0) {
      await sleep(SLEEP_TIME);
    }
    const { id, address } = sender;
    let [sui, qualifiedToSendGas] = await Promise.all([
      exec(() => getCurrentSui(address)),
      exec(() => isQualifiedToSendGas(address, true, INCLUDE_FIRST_AIRDROP), 2),
    ]);
    if (!qualifiedToSendGas) {
      console.log(`Account ${id} (${address}) is not linked yet!`);
      continue;
    }
    if (sui <= MIN_SUI_PER_SPONSOR_ACCOUNT) {
      // send gas
      const sendAmount = SPONSOR_SUI_PER_ACCOUNT - sui;
      console.log(
        `${id} Sending gas ${sendAmount} SUI to address (${address}) SUI=${sui}`
      );
      try {
        const response = await exec(
          () => sendSui(defaultAddress, address, sendAmount),
          0.5
        );
        if (response.effects.status.status != "success") {
          console.log(`Sending fail, response: ${JSON.stringify(response)}`);
          continue;
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      console.log(`${id} Enough gas, having ${sui.toFixed(3)} SUI`);
    }
  }
};

main();
