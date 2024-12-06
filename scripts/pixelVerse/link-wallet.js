import {
  getLinkedWallets,
  linkWallet,
  removeWallet,
} from "../../utils/pixelVerse.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPixelVerseAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(50);
const force = true;

const main = async () => {
  const secrets = await getAllPixelVerseAddress();
  let c = -1;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            while (true) {
              try {
                const wallets = await getLinkedWallets(secret);
                const address = await secret.address;
                if (wallets.length == 0 || (force && address)) {
                  if (address) {
                    if (wallets.length > 0) {
                      if (
                        address?.toLowerCase() ==
                        wallets[0]?.address?.toLowerCase()
                      ) {
                        return;
                      } else {
                        console.log(`${secret.id} Delete wallet`);
                        await removeWallet(secret, wallets[0]?.id);
                      }
                    }

                    console.log(`${secret.id} Set address ${address}`);
                    await linkWallet(secret, address);
                    console.log(`${secret.id} Set address success`);
                  } else {
                    console.log(`${secret.id} Missing seedphase`);
                  }
                }
                return;
              } catch (e) {
                console.log(`${secret.id} ERROR: ${e?.message}`);
              }
            }
          }
        })
    )
  );
};

main();
