import {
  bindAddress,
  getUserInfo,
  login,
} from "../../utils/djdog.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllDjDogAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(30);

const main = async () => {
  const secrets = await getAllDjDogAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            try {
              let { access_token } = await login(secret);
              let { bindTonAddress } = await getUserInfo(
                secret,
                access_token
              );
              if (!bindTonAddress) {
                const address = await secret.address();
                if (!address) {
                  secret.log(`${secret.id} Missing seed phases`)
                  return
                }
                secret.log(`${secret.id} Link with address ${address}`);
                await bindAddress(secret, access_token, address);
                secret.log(`${secret.id} Link address success!`);
              }
            } catch (e) {
              secret.error(`${secret.id} ERROR: ${e?.message || e}`);
            }
          }
        })
    )
  );
};

main();
