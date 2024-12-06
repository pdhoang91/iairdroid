import { sleep } from "../../utils/helper.js";
import {
  finishLevelUp,
  getBalance,
  getPixelLevel,
  skipLevelUp,
  startLevelUp,
} from "../../utils/pixelVerse.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPixelVerseAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllPixelVerseAddress();
  let c = -1;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            while (true) {
              try {
                let {
                  value: level,
                  tasksToLevelup,
                  levelupStartedAt,
                  levelupFinishAvailable,
                  levelupProcessSkipPrice,
                } = await getPixelLevel(secret);
                const completedTasks = tasksToLevelup.filter(
                  ({ completed }) => completed
                );
                const uncompletedTasks = tasksToLevelup.filter(
                  ({ completed }) => !completed
                );
                if (!levelupStartedAt && uncompletedTasks.length > 0) {
                  console.log(
                    `${secret.id} Uncompleted tasks to upgrade to lv ${
                      level + 1
                    }: ${uncompletedTasks.map(({ name, value, progress }) => `${name} (${progress}/${value})`).join(", ")}`
                  );
                  return;
                }
                if (!levelupStartedAt) {
                  while (true) {
                    try {
                      console.log(`${secret.id} Upgrade to level ${level + 1}`);
                      await startLevelUp(secret);
                      console.log(
                        `${secret.id} Upgrade to level ${level + 1} SUCCESS!`
                      );
                      break;
                    } catch (e) {
                      if (e?.response?.data?.message == "Levelup process already started") break
                      console.error(
                        `${secret.id} Start level up error: ${
                          e?.response?.data?.message || e?.message
                        }`
                      );
                      await sleep(1)
                    }
                  }
                  continue;
                }
                if (!levelupFinishAvailable) {
                  while (true) {
                    try {
                      const balance = await getBalance(secret);
                      if (balance < levelupProcessSkipPrice) {
                        console.log(
                          `${secret.id} Not enough money to skip level up (require ${levelupProcessSkipPrice})`
                        );
                        return;
                      }
                      console.log(
                        `${secret.id} Skip upgrade level ${
                          level + 1
                        } wait time (require ${levelupProcessSkipPrice})`
                      );
                      await skipLevelUp(secret);
                      levelupFinishAvailable = true;
                      console.log(
                        `${secret.id} Skip upgrade level ${
                          level + 1
                        } wait time SUCCESS!`
                      );
                      break;
                    } catch (e) {
                      if (e?.response?.data?.message == "Levelup process is finished") break
                      console.log(
                        `${secret.id} Skip upgrade level fail: ${
                          e?.response?.data?.message || e?.message
                        }`
                      );
                      await sleep(1)
                    }
                  }
                }
                if (levelupFinishAvailable) {
                  while (true) {
                    try {
                      console.log(
                        `${secret.id} Finish upgrade level ${level + 1}`
                      );
                      await finishLevelUp(secret);
                      console.log(
                        `${secret.id} Finish upgrade level ${
                          level + 1
                        } SUCCESS!`
                      );
                      break;
                    } catch (e) {
                      if (e?.response?.data?.message == "Levelup not available") break
                      console.log(
                        `${secret.id} Finish level fail: ${
                          e?.response?.data?.message || e?.message
                        }`
                      );
                      await sleep(1)
                    }
                  }
                }
              } catch (e) {
                console.log(
                  `${secret.id} ERROR: ${
                    e?.response?.data?.message || e?.message
                  }`
                );
                await sleep(1)
              }
            }
          }
        })
    )
  );
};

main();
