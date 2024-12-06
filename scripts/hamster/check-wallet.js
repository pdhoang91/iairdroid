import { nonBounceableFmt } from "../../utils/balance-ton.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(1000);
const MAX_RETRY = 3;

const main = async () => {
  const secrets = await getAllHamsterAddress();
  let c = -1;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry < MAX_RETRY) {
              try {
                const address = (await secret.getWallet())?.address
                while (c < i) {
                  if (c == i - 1) {
                    secret.log(`,${secret.receiveAddress},${nonBounceableFmt(address)}`)
                    c++;
                  }
                  await sleep(0.05);
                }
                return;
              } catch (e) {
                retry++;
                while (true) {
                  if (c == i - 1) {
                    console.log(`${secret.id} Lỗi: ${e.message}`);
                    if (retry == MAX_RETRY) {
                      c++;
                    }
                    break;
                  }
                  await sleep(0.05);
                }
              }
            }
          }
        })
    )
  );
};

main();
