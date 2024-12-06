import { nonBounceableFmt } from "../../utils/balance-ton.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllYescoinAddress } from "../../utils/wallet.js";
import {
  getWallet,
  linkWallet,
  login,
  unlinkWallet,
} from "../../utils/yescoin.js";

const { exec } = newSemaphore(100);
const force = true;

const main = async () => {
  const secrets = await getAllYescoinAddress();
  let c = -1;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            while (true) {
              try {
                let access_token = await login(secret);
                const wallets = await getWallet(secret, access_token);
                const address = (await secret.getWallet())?.address;
                let bounceAddress, nonBounceAddress;
                if (address) {
                  bounceAddress = address.toString();
                  nonBounceAddress = nonBounceableFmt(address);
                }
                // secret.log(`Found ${wallets.length} wallets`);
                if (wallets.length == 0 || (force && bounceAddress)) {
                  if (address) {
                    const rawAddress = await secret.rawAddress();
                    const publicKey = await secret.publicKey();
                    if (wallets.length > 0) {
                      // console.log(wallets);
                      const unwantedWallets = wallets.filter(
                        (wallet) =>
                          ![bounceAddress, nonBounceAddress].includes(
                            wallet.friendlyAddress
                          )
                      );
                      if (unwantedWallets.length > 0) {
                        secret.log(
                          `Found ${
                            unwantedWallets.length
                          } unwanted wallet: ${unwantedWallets
                            .map(({ friendlyAddress }) => friendlyAddress)
                            .join(", ")}`
                        );
                        for (const _ of wallets) {
                          console.log(`${secret.id} Delete wallet`);
                          await unlinkWallet(secret, access_token);
                          await sleep(1);
                        }
                        await sleep(3);
                        continue;
                      }
                    }
                    const matchWallet = wallets.find((wallet) => [bounceAddress, nonBounceAddress].includes(wallet.friendlyAddress));
                    if (matchWallet) return;

                    console.log(
                      `${secret.id} Set address=${bounceAddress}, publicKey=${publicKey}, raw=${rawAddress}`
                    );
                    await linkWallet(
                      secret,
                      access_token,
                      bounceAddress,
                      publicKey,
                      rawAddress
                    );
                    console.log(`${secret.id} Set address success`);
                  } else {
                    console.log(`${secret.id} Missing seedphase`);
                  }
                }
                return;
              } catch (e) {
                console.log(`${secret.id} ERROR: ${e?.message}`);
                if (e?.message == "invalid code error") return
              }
            }
          }
        })
    )
  );
};

main();
