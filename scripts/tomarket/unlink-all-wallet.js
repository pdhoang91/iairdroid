import { newSemaphore } from "../../utils/semaphore.js";
import {
  deleteWallet,
  getWallet,
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
            try {
              let access_token = await login(secret);
              let bindTonAddress = await getWallet(secret, access_token);
              const address = (await secret.getWallet())?.address;
              if (!address) {
                secret.log(` Missing seed phases`);
                return;
              }
              if (bindTonAddress) {
                secret.log(`Delete wallet ${bindTonAddress}`);
                await deleteWallet(secret, access_token);
                bindTonAddress = null;
              }
            } catch (e) {
              // console.error(e);
              secret.error(`ERROR: ${e?.message || e}`);
            }
          }
        })
    )
  );
};

main();
