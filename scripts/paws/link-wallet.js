import { nonBounceableFmt } from "../../utils/balance-ton.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPawsAddress } from "../../utils/wallet.js";
import {
  deleteWallet,
  getUserInfo,
  linkWallet,
  login,
} from "../../utils/paws.js";

const { exec } = newSemaphore(300);

const main = async () => {
  let secrets = await getAllPawsAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                await login(secret);
                let userInfo = await getUserInfo(secret);
                let bindTonAddress = userInfo?.userData?.wallet;
                const address = (await secret.getWallet())?.address;
                if (!address) {
                  secret.log(`Missing seed phases`);
                  return;
                }
                const nonBounceAddress = nonBounceableFmt(address);
                if (bindTonAddress && bindTonAddress != nonBounceAddress) {
                  secret.log(`Delete wallet ${bindTonAddress}`);
                  await deleteWallet(secret);
                  bindTonAddress = null;
                }

                if (!bindTonAddress) {
                  secret.log(`Link with address ${nonBounceAddress}`);
                  await linkWallet(secret, nonBounceAddress);
                  secret.log(`Link address success!`);
                }
                return;
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
