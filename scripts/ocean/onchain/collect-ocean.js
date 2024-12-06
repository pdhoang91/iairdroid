import {
  MIN_OCEAN_PER_ACCOUNT,
  MIN_OCEAN_TO_HARVESH,
  MIN_SUI_TO_SEND,
  isAccountDied,
} from "../../../config/account.js";
import { seedphases } from "../../../config/secret.js";
import {
  getCurrentOcean,
  getCurrentSui,
  getGasPerSendTx,
  sendOcean,
  sendSui,
} from "../../../utils/balance-ocean.js";
import { sleep } from "../../../utils/helper.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getDefaultAddress, getDerivativeAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(2);
const MAX_RETRY = 3;
const main = async () => {
  let total = 0;
  await Promise.all(
    seedphases.map(async (seedphase, x) => {
      let { name } = seedphases[x];
      const { address: receiverAddress } = await getDefaultAddress(name);
      await Promise.all(
        Array.from(Array(99).keys()).map(
          async (i) =>
            await exec(async () => {
              if (i == 0) return;
              const secret = await getDerivativeAddress(name, i);
              let retry = 0;
              while (retry < MAX_RETRY) {
                retry++
                try {
                  let [sui, ocean] = await Promise.all([
                    reqExec(async () => await getCurrentSui(secret.address)),
                    reqExec(async () => await getCurrentOcean(secret.address)),
                  ]);

                  let sendOceanAmount = ocean - MIN_OCEAN_PER_ACCOUNT;
                  if (isAccountDied(secret.address)) {
                    sendOceanAmount = ocean;
                  } else if (sendOceanAmount < MIN_OCEAN_TO_HARVESH) {
                    return;
                  }
                  secret.log(
                    `Collect ${sendOceanAmount} OCEAN from address ${secret.address} SUI=${sui} OCEAN=${ocean} to address (${receiverAddress}) (${retry})`
                  );
                  const response = await reqExec(async () => await sendOcean(
                    secret,
                    receiverAddress,
                    sendOceanAmount,
                    sendOceanAmount == ocean,
                  ), 0.5);
                  if (!response) {
                    continue
                  }
                  if (response.effects.status.status != "success") {
                    secret.log(
                      `Sending fail, response: ${JSON.stringify(response)}`
                    );
                    continue
                  }
                  total += sendOceanAmount;
                  ocean -= sendOceanAmount;
                  if (isAccountDied(secret.address)) {
                    const sendSuiAmount = sui - (await reqExec(async () => await getGasPerSendTx()));
                    if (sendSuiAmount <= MIN_SUI_TO_SEND / 4) {
                      return;
                    }
                    secret.log(
                      `Collect ${sendSuiAmount} SUI from address ${secret.address} SUI=${sui} OCEAN=${ocean} to address (${receiverAddress})`
                    );
                    const sendSuiResponse = await reqExec(async () => await sendSui(
                      secret,
                      receiverAddress,
                      sendSuiAmount
                    ));
                    if (!sendSuiResponse) {
                      continue
                    }
                    if (sendSuiResponse.effects.status.status != "success") {
                      secret.log(
                        `Sending fail, response: ${JSON.stringify(
                          sendSuiResponse
                        )}`
                      );
                      continue
                    }
                  }
                  return
                } catch (e) {
                  secret.error(e);
                  await sleep(0.5);
                }
              }
            })
        )
      );
    })
  );

  console.log(`==> Total collect ${total} OCEAN!`);
};
main();
