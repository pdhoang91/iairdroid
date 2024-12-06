import { newSemaphore } from "../../utils/semaphore.js";
import { checkRequirement, getSpinnerInitData, register } from "../../utils/spinner.js";
import { getAllSpinnerAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const main = async () => {
  const secrets = await getAllSpinnerAddress();

  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          while (true) {
            try {
              await register(secret);
              let { sections } = await getSpinnerInitData(secret);
              for (const section of sections) {
                for (const task of section.tasks) {
                  for (const requirement of task.requirements) {
                    let success = false,
                      reward;
                    try {
                      let result = await checkRequirement(secret, requirement.id);
                      success = result.success;
                      reward = result.reward;
                    } catch (e) {
                      if (e?.response?.status != 400) {
                        secret.log(
                          `[${e?.response?.status}] Task ${requirement.name
                          } error: ${e?.response?.data?.message || e?.message}`
                        );
                      } else {
                        // console.error(`${secret.id} Requirement ${requirement.name} error: ${e?.response?.data?.message || e?.message}`)
                      }
                    }
                    if (success) {
                      secret.log(
                        `Claim requirement ${requirement.name} success, reward: ${reward}`
                      );
                    }
                  }
                }
              }
              break;
            } catch (e) {
              secret.error(e);
            }
          }
        })
    )
  );
};

main();
