import { sleep } from "../../utils/helper.js";
import {
  checkTelegramTask,
  checkUserTask,
  getTasks,
  startTask,
} from "../../utils/pixelVerse.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPixelVerseAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(50);
const ONLY_TASKS = ["tasks.telegram.pixelverse.channel"]

const main = async () => {
  const secrets = await getAllPixelVerseAddress();
  let c = -1;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            while (true) {
              let isDone = true;
              try {
                const {available, done, inProgress} = await getTasks(secret);
                for(const task of available) {
                  if (task.type == "SNAPSHOT") continue
                  if (ONLY_TASKS.length > 0 && !ONLY_TASKS.includes(task.title)) continue
                  console.log(`${secret.id} Start task ${task.title} (type=${task.type})`)
                  isDone = false;
                  while(true) {
                    try {
                      await startTask(secret, task.id);
                      console.log(`${secret.id} Start task ${task.title} SUCCESS!`)
                      break
                    } catch(e) {
                      console.error(`${secret.id} ERROR: ${e?.response?.data?.message || e?.message}`)
                      await sleep(1)
                    }
                  }
                }
                for(const userTask of inProgress) {
                  if (userTask.type == "SNAPSHOT") continue
                  if (ONLY_TASKS.length > 0 && !ONLY_TASKS.includes(userTask.title)) continue
                  while(true) {
                    try {
                      if (userTask.type == "TELEGRAM") {
                        console.log(`${secret.id} Check telegram task ${userTask.title}...`)
                        await checkTelegramTask(secret, userTask.userTaskId);
                      } else {
                        console.log(`${secret.id} Check task ${userTask.title}...`)
                        await checkUserTask(secret, userTask.userTaskId);
                      }
                      console.log(`${secret.id} Check task ${userTask.title} SUCCESS!`)
                      break;
                    } catch(e) {
                      if (e?.response?.status == 400 || e?.response?.status == 404 || e?.response?.data?.message == "You are not subscribed to this telegram channel") {
                        console.error(`${secret.id} Check task ${userTask.title} fail: ${e?.response?.data?.message}`)
                        break
                      } else {
                        console.error(`${secret.id} ERROR: ${e?.message}`)
                      }
                      await sleep(1)
                    }
                  }
                }
                if (isDone) return;
              } catch (e) {
                console.log(`${secret.id} ERROR: ${e?.response?.data?.message || e?.message}`);
                await sleep(1)
                // if (e?.response?.status == 401) return
              }
            }
          }
        })
    )
  );
};

main();
