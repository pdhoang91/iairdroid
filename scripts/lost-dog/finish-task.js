import { sleep } from "../../utils/helper.js";
import { completeCommonTask, getNotDoneTasks } from "../../utils/lost-dog.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllLostDogAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const MAX_RETRY = 3;

const main = async () => {
  const secrets = await getAllLostDogAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry < MAX_RETRY) {
              try {
                const notDoneTasks = await getNotDoneTasks(secret);
                secret.log(`${notDoneTasks.length} not done tasks`)
                for (const task of notDoneTasks) {
                  let {
                    id,
                    name,
                    woofReward,
                    dogReward,
                    customCheckStrategy,
                  } = task;
                  if (customCheckStrategy) {
                    secret.log(`Unhandle custom check strategy for task ${name} (id=${id})`)
                    continue
                  }
                  woofReward = parseInt(woofReward || 0) / 1_000_000_000
                  let retry = 0;
                  while (retry < MAX_RETRY) {
                    try {
                      const response = await completeCommonTask(secret, id)
                      if (response?.success) {
                        secret.log(
                          `Claim task ${name} (id=${id}) success! +${woofReward} WOOF, +${dogReward} BONES`
                        );
                      } else {
                        throw new Error(name + ": " + JSON.stringify(response))
                      }
                      break
                    } catch (e) {
                      retry++;
                      secret.error(e);
                    } finally {
                      await sleep(1)
                    }
                  }

                }
                return;
              } catch (e) {
                retry++;
                console.log(`${secret.id} ERROR: ${e?.message}`);
              }
            }
          }
        })
    )
  );
};

main();
