import {
  MIN_OCEAN_PER_ACCOUNT,
  MIN_OCEAN_TO_HARVESH,
  MIN_SUI_TO_SEND,
  isAccountDied,
} from "../../../config/account.js";
import {
  getCurrentOcean,
  getCurrentSui,
  getGasPerSendTx,
  sendOcean,
  sendSui,
} from "../../../utils/balance-ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress, getDefaultAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(2);

const main = async () => {
  const { address: receiverAddress } = await getDefaultAddress("wave-wallet-c");
  const secrets = await getAllOceanAddress();
  let total = 0;
  await Promise.all(
    secrets.map(
      async (sender) =>
        await exec(async () => {
          while (true) {
            try {
              let [sui, ocean] = await Promise.all([
                reqExec(() => getCurrentSui(sender.address)),
                reqExec(() => getCurrentOcean(sender.address)),
              ]);

              let sendOceanAmount = ocean - MIN_OCEAN_PER_ACCOUNT;

              if (isAccountDied(sender.address)) {
                sendOceanAmount = ocean;
              } else if (sendOceanAmount < MIN_OCEAN_TO_HARVESH) {
                return;
              }
              sender.log(
                `Collect ${sendOceanAmount} OCEAN from address (${sender.address}) SUI=${sui} OCEAN=${ocean} to address (${receiverAddress})`
              );
              const response = await reqExec(() => sendOcean(
                sender,
                receiverAddress,
                sendOceanAmount,
                sendOceanAmount == ocean,
              ), 0.5);
              if (!response) {
                continue
              }
              if (response.effects.status.status != "success") {
                sender.log(
                  `Sending fail, response: ${JSON.stringify(response)}`
                );
                continue
              }
              total += sendOceanAmount;
              ocean -= sendOceanAmount;
              if (isAccountDied(sender.address)) {
                const sendSuiAmount = sui - (await reqExec(() => getGasPerSendTx()));
                if (sendSuiAmount <= MIN_SUI_TO_SEND / 4) {
                  return;
                }
                sender.log(
                  `Collect ${sendSuiAmount} SUI from address (${sender.address}) SUI=${sui} OCEAN=${ocean} to address (${receiverAddress})`
                );
                const sendSuiResponse = await reqExec(() => sendSui(
                  sender,
                  receiverAddress,
                  sendSuiAmount
                ), 0.5);
                if (!sendSuiResponse) {
                  continue
                }
                if (sendSuiResponse.effects.status.status != "success") {
                  sender.log(
                    `Sending fail, response: ${JSON.stringify(sendSuiResponse)}`
                  );
                  continue
                }
              }
              return
            } catch (e) {
              sender.error(e);
            }
          }

        })
    )
  );

  console.log(`==> Total collect ${total} OCEAN!`);
};
main();
