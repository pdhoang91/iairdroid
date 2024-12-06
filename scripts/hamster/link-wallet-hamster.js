import { Address } from "@ton/core";
import {
  deleteHamsterLinkedWallet,
  getHamsterSync,
  linkHamsterWallet,
} from "../../utils/hamster.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";
import { nonBounceableFmt } from "../../utils/balance-ton.js";
import { sleep } from "../../utils/helper.js";

const { exec } = newSemaphore(30);
const { exec: execAirdropTask } = newSemaphore(10);
const force = true;

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
                const { airdropTasks } = sync;

                const airdropWalletTask =
                  airdropTasks?.airdrop_connect_ton_wallet;
                const address = await secret.rawAddress();
                if (!airdropWalletTask || (force && address)) {
                  if (address) {
                    const localAddress = nonBounceableFmt(
                      (await secret.getWallet()).address
                    );
                    await execAirdropTask(async () => {
                      if (airdropWalletTask) {
                        const linkedAddress = nonBounceableFmt(
                          Address.parse(airdropWalletTask.walletAddress)
                        );
                        if (linkedAddress != localAddress) {
                          secret.log(`Delete wallet ${linkedAddress} cause not match with local wallet ${localAddress}`);
                          await deleteHamsterLinkedWallet(secret);
                        } else return
                      }
                      secret.log(`Set address ${localAddress}`);
                      await linkHamsterWallet(secret, address);
                      secret.log(`Set address success`);
                    });
                  } else {
                    secret.log(`Missing seedphase`);
                  }
                }
                return
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
