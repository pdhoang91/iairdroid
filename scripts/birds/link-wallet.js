import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBirdsAddress } from "../../utils/wallet.js";
import { bindWallet, getWallet } from "../../utils/birds.js";

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
              const address = secret.address;
              if (!address) {
                secret.log(` Missing seed phases`);
                return;
              }
              if (bindedAddress && bindedAddress != address) {
                secret.log(`Wallet ${address} mismatch with current wallet ${bindedAddress}`);
                return
              }

              if (!bindedAddress) {
                secret.log(
                  `Link with address ${address}`
                );
                await bindWallet(
                  secret,
                  address
                );
                secret.log(`Link address success!`);
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
