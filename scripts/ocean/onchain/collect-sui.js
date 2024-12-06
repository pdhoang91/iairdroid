import {
  AIRDROP_SUI_PER_ACCOUNT,
  MIN_OCEAN_TO_SWAP,
  MIN_SUI_TO_SEND,
  isAccountDied,
} from "../../../config/account.js";
import { seedphases } from "../../../config/secret.js";
import {
  getAccountLevelAndMultiple,
  getCurrentOcean,
  getCurrentSui,
  getGasPerSendTx,
  sendSui,
} from "../../../utils/balance-ocean.js";
import { swap_OCEAN_SUI } from "../../../utils/swap-ocean.js";
import { getDefaultAddress, getDerivativeAddress } from "../../../utils/wallet.js";

const main = async () => {
  let total = 0;
  for (let x = 0; x < seedphases.length; x++) {
    let { name } = seedphases[x];
    const { address: receiverAddress } = await getDefaultAddress(name);
    for (let i = 1; i < 99; i++) {
      const senderAddress = await getDerivativeAddress(name, i);
      let [sui, ocean, { exist }] = await Promise.all([
        getCurrentSui(senderAddress.address),
        getCurrentOcean(senderAddress.address),
        getAccountLevelAndMultiple(senderAddress.address),
      ]);

      let sendAmount = sui - AIRDROP_SUI_PER_ACCOUNT;
      if (isAccountDied(senderAddress.address) || (!exist && sui > 0)) {
        if (ocean > MIN_OCEAN_TO_SWAP) {
          console.log(
            `${senderAddress.id} Collect all ocean from dead account (${senderAddress.address})`
          );
          const response = await swap_OCEAN_SUI(senderAddress, ocean, 1);
          if (!response) {
            console.log(">> No route found!");
          } else if (response.effects.status.status != "success") {
            console.log(`Swap fail, response: ${JSON.stringify(response)}`);
          } else {
            // swap success
            [sui, ocean] = await Promise.all([
              getCurrentSui(senderAddress.address),
              getCurrentOcean(senderAddress.address),
            ]);
          }
        }

        sendAmount = sui - (await getGasPerSendTx());
        if (sendAmount <= MIN_SUI_TO_SEND / 4) {
          continue;
        }
      } else if (sendAmount < MIN_SUI_TO_SEND) {
        continue;
      }
      console.log(
        `${senderAddress.id} Collect ${sendAmount} SUI from address  (${senderAddress.address}) SUI=${sui} OCEAN=${ocean} to address (${receiverAddress})`
      );
      try {
        const response = await sendSui(
          senderAddress,
          receiverAddress,
          sendAmount
        );
        if (!response) {
          continue;
        }
        if (response.effects.status.status != "success") {
          console.log(`Sending fail, response: ${JSON.stringify(response)}`);
          continue;
        }
        total += sendAmount;
        console.log(
          `  ${senderAddress.address} SUI=${await getCurrentSui(
            senderAddress.address
          )} OCEAN=${await getCurrentOcean(senderAddress.address)}`
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  console.log(`==> Total collect ${total} SUI!`);
};
main();
