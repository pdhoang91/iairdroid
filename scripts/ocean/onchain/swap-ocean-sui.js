import {
  MIN_OCEAN_TO_HARVESH,
  isAccountDied,
} from "../../../config/account.js";
import { seedphases } from "../../../config/secret.js";
import {
  getCurrentOcean,
  getCurrentSui,
} from "../../../utils/balance-ocean.js";
import { swap_OCEAN_SUI } from "../../utils/swap.js";
import { getDefaultAddress } from "../../../utils/wallet.js";

const MAX_OCEAN_TO_HARVESH = 1000;
const HARVESH_ALL_OCEAN = true;

const main = async () => {
  for (let x = 0; x < seedphases.length; x++) {
    console.log("                  ==================")
    let { name } = seedphases[x];

    const senderAddress = await getDefaultAddress(name);
    let [sui, ocean] = await Promise.all([
      getCurrentSui(senderAddress.address),
      getCurrentOcean(senderAddress.address),
    ]);
    if (
      !isAccountDied(senderAddress.address) &&
      ocean >= MIN_OCEAN_TO_HARVESH
    ) {
      console.log(
        `>>> Bank account ${name}#0 (${senderAddress.address}) SUI=${sui} OCEAN=${ocean}`
      );
      let amount = ocean;
      if (amount <= MIN_OCEAN_TO_HARVESH) continue
      if (!HARVESH_ALL_OCEAN && amount >= MAX_OCEAN_TO_HARVESH) amount = MAX_OCEAN_TO_HARVESH
      try {
        const response = await swap_OCEAN_SUI(senderAddress, amount, 1);
        if (!response) {
          console.log(">> No route found!");
        } else if (response.effects.status.status != "success") {
          console.log(`Swap fail, response: ${JSON.stringify(response)}`);
        } else {
          console.log(
            `=> ${senderAddress.address} SUI=${await getCurrentSui(
              senderAddress.address
            )} OCEAN=${await getCurrentOcean(senderAddress.address)}`
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
};
main();
