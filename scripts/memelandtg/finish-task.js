import { sleep } from "../../utils/helper.js";
import { claimTask, getDoneTasks, login, taskConfig } from "../../utils/memelandtg.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllMemelandtgAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);

const main = async () => {
  const secrets = await getAllMemelandtgAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                const token = await login(secret)
                const doneTasks = await getDoneTasks(secret, token);
                const isTaskDone = (id) => doneTasks.find((taskId) => taskId == id);
                for (const taskId of Object.keys(taskConfig)) {
                  if (isTaskDone(taskId)) continue
                  secret.log(`Claim task ${taskId}`)
                  const { meme, success } = await claimTask(secret, token, taskId);
                  if (success) {
                    secret.log(`Claim task ${taskId} SUCCESS! +${meme} MEME`)
                    doneTasks.push(taskId);
                  }
                }
                return;
              } catch (e) {
                // console.error(e)
                // secret.error(e);
                secret.log(`ERROR: ${e?.message}`);
                await sleep(1);
              }
            }
          }
        })
    )
  );
};

main();
