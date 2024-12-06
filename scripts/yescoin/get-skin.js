import { newSemaphore } from "../../utils/semaphore.js";
import { getAllYescoinAddress } from "../../utils/wallet.js";
import {
  finishTask,
  getSkinList,
  getSkinTasks,
  login,
} from "../../utils/yescoin.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllYescoinAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                let access_token = await login(secret);
                const {originalList, yesSummerList} = await getSkinList(secret, access_token);
                for (const {skinId, skinName, skinStatus} of yesSummerList) {
                  if (skinStatus == 0) {
                    // get skins
                    const tasks = await getSkinTasks(secret, access_token, skinId);
                    for (const task of tasks) {
                      const {taskId, taskName, taskDescription, taskBonusAmount, taskStatus} = task;
                      if (taskStatus == 0) {
                        let retry = 0;
                        while(retry < 3) {
                          try {
                            console.log(`${secret.id} Finish task ${taskName} (${taskDescription})`)
                            const {code, data: success, message} = await finishTask(secret, access_token, taskId);
                            if (success) {
                              console.log(`${secret.id} Finish task ${taskName} (${taskDescription}) SUCCESS!`);
                              break
                            } else throw new Error(message);
                          } catch(e) {
                            retry++;
                            console.error(`${secret.id} ERROR: ${e?.message}`)
                          }
                        }
                      }
                    }
                  }
                }
                return;
              } catch (e) {
                console.log(`${secret.id} ERROR: ${e?.message}`);
              }
            }
          }
        })
    )
  );
};

main();
