import { claimRefMission, getAccountLevelAndMultiple } from "../../../utils/balance-ocean.js";
import { sleep } from "../../../utils/helper.js";
import { claimMissionSignature, isRefEnough, login } from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(2);

const main = async () => {
  const secrets = await getAllOceanAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                const { exist } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
                if (!exist) return
                await login(secret);
                const { reference, completed } = await isRefEnough(secret);
                if (completed) return;
                if (reference == "succeeded") {
                  secret.log("Claim mission signature");
                  const { signature } = await claimMissionSignature(secret);
                  secret.log("Claim mission reward")
                  const response = await reqExec(() => claimRefMission(secret, signature), 0.5);
                  if (response.effects.status.status != "success") {
                    throw new Error(
                      response?.effects?.status?.error ||
                      `Sending fail, response: ${JSON.stringify(response)}`
                    );
                  }
                  secret.log("Claim mission reward success!");
                } else {
                  secret.log("Not enough ref")
                }
                return;
              } catch (e) {
                console.error(e);
                // secret.error(e);
                secret.log(`ERROR: ${e?.message}`);
                await sleep(5);
              }
            }
          }
        })
    )
  );
};

main();
