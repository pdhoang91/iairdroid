import { nonBounceableFmt } from "../../utils/balance-ton.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllTonAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(500);
const MAX_RETRY = 3;

const main = async () => {
  const secrets = await getAllTonAddress();
  let c = -1;
  await Promise.all(
    secrets
      .map((secret, i) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              const address = (await secret.getWallet())?.address;
              const addressV5 = (await secret.getWalletV5())?.address;
              const nonBounceAddress = nonBounceableFmt(address);
              const nonBounceAddressV5 = nonBounceableFmt(addressV5);
              while (c < i) {
                if (c == i - 1) {
                  secret.log(`,${nonBounceAddress},${secret.privateKey}`)
                  secret.log(`,${nonBounceAddressV5},${secret.privateKey}`)
                  c++;
                  return;
                }
                await sleep(0.05);
              }
            } catch (e) {
              while (true) {
                if (c == i - 1) {
                  secret.error(e);
                  if (retry == MAX_RETRY) {
                    c++;
                  }
                  break;
                }
                await sleep(0.05);
              }
            }
          }
        })
      )
  );
};

main();
