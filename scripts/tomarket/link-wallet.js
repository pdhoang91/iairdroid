import { Address } from "@ton/core";
import { nonBounceableFmt } from "../../utils/balance-ton.js";
import { newSemaphore } from "../../utils/semaphore.js";
import {
  deleteWallet,
  getWallet,
  linkWallet,
  login,
} from "../../utils/tomarket.js";
import { getAllTomarketAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(300);

const main = async () => {
  let secrets = await getAllTomarketAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while(true) {
              try {
                let access_token = await login(secret);
                let bindTonAddress = await getWallet(secret, access_token);
                const address = (await secret.getWallet())?.address;
                if (!address) {
                  secret.log(` Missing seed phases`);
                  return;
                }
                const nonBounceAddress = nonBounceableFmt(address);
                if (bindTonAddress && bindTonAddress != nonBounceAddress) {
                  secret.log(`Delete wallet ${bindTonAddress}`);
                  await deleteWallet(secret, access_token);
                  bindTonAddress = null;
                }
  
                if (!bindTonAddress) {
                  secret.log(
                    `Link with address ${nonBounceAddress}`
                  );
                  await linkWallet(
                    secret,
                    access_token,
                    nonBounceAddress
                  );
                  secret.log(`Link address success!`);
                }
                return
              } catch (e) {
                // console.error(e);
                secret.error(`ERROR: ${e?.message || e}`);
              }
            }
          }
        })
    )
  );
};

main();
