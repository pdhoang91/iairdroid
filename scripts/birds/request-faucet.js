import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBirdsAddress } from "../../utils/wallet.js";
import { getFaucet, getWallet } from "../../utils/birds.js";

const { exec } = newSemaphore(100);

const main = async () => {
  let secrets = await getAllBirdsAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            try {
              let { address: bindedAddress, isFaucetRequested } = await getWallet(secret);
              if (!bindedAddress) return
              if (!isFaucetRequested) {
                secret.log("Request faucet");
                await getFaucet(secret, bindedAddress);
                secret.log("Request faucet SUCCESS");
              } else {
                secret.log("Faucet already requested");
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
