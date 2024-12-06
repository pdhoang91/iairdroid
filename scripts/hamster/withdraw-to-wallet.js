import {
  getHamsterSync,
  setWalletAsDefault,
} from "../../utils/hamster.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";
import { nonBounceableFmt } from "../../utils/balance-ton.js";
import { sleep } from "../../utils/helper.js";

const { exec } = newSemaphore(30);
const { exec: execWithdrawTask } = newSemaphore(10);

const main = async () => {
  const secrets = await getAllHamsterAddress();
  let c = -1;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            while (true) {
              try {
                const sync = await getHamsterSync(secret);
                const { withdraw } = sync;
                const address = await secret.rawAddress();
                if (!withdraw.selected) {
                  if (address) {
                    const localAddress = nonBounceableFmt(
                      (await secret.getWallet()).address
                    );
                    await execWithdrawTask(async () => {
                      secret.log(
                        `Withdraw to wallet to address ${localAddress}`
                      );
                      await setWalletAsDefault(secret, localAddress);
                      secret.log(
                        `Withdraw to wallet to address ${localAddress} SUCCESS!`
                      );
                    });
                  } else {
                    secret.log(`Missing seedphase`);
                  }
                }
                return;
              } catch (e) {
                secret.error(e);
                await sleep(1);
              }
            }
          }
        })
    )
  );
};

main();
