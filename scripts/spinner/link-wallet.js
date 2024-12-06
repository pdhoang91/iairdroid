import { Address } from "@ton/core";
import { newSemaphore } from "../../utils/semaphore.js";
import { deleteWallet, getSpinnerInitData, linkWallet } from "../../utils/spinner.js";
import { getAllSpinnerAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  let secrets = await getAllSpinnerAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while(true) {
              try {
                let {user} = await getSpinnerInitData(secret);
                let bindTonAddress = user?.address;
                if (bindTonAddress) {
                  bindTonAddress = Address.parse(bindTonAddress).toRawString();
                }
                const address = (await secret.getWallet())?.address;
                if (!address) {
                  secret.log(` Missing seed phases`);
                  return;
                }
                const rawAddress = address.toRawString();
                if (bindTonAddress && bindTonAddress != rawAddress) {
                  secret.log(`Delete wallet ${bindTonAddress}`);
                  await deleteWallet(secret);
                  bindTonAddress = null;
                }
  
                if (!bindTonAddress) {
                  secret.log(
                    `Link with address ${rawAddress}`
                  );
                  await linkWallet(
                    secret,
                    rawAddress
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
