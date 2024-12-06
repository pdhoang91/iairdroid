import { sleep } from "../../../utils/helper.js";
import {
  getRefCount,
  getWeweTask,
  loginMemeCulture,
  submitWeweTask,
} from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(100);
const SQUAD_CODE = "0tg8ty";
const main = async () => {
  const secrets = await getAllOceanAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                if (!secret.initParams) return
                await loginMemeCulture(secret);
                let tasks = await getWeweTask(secret);
                const refCount = await getRefCount(secret)
                for (const task of tasks) {
                  const { id, name, reward, need_submit, status, params, code } = task;
                  if (["CREATE", "COPY"].includes(params.action)) continue
                  if (params.action == "SHARE" && params.amount && params.amount > refCount) continue
                  if (params.action == "OPEN" && params.chat_id) continue
                  if (params.action == "WATCH" && params.question) continue
                  if (status == 0) {
                    if (need_submit) {
                      let answer;
                      switch (code) {
                        case "DAILY_SQUAD_DROP":
                          answer = SQUAD_CODE;
                          break
                      }
                      secret.log(`Submit task ${name}${answer ? ` with answer "${answer}"` : ""}`);
                      const { message } = await submitWeweTask(secret, id, answer);
                      if (message == "Congratulations, you have completed this task!") {
                        secret.log(`Submit task ${name} SUCCESS! +${reward} WEWE`);
                      } else {
                        secret.log(`Submit task ${name} SUCCESS! Now verifying... (msg = ${message})`);
                      }
                    }
                  }
                }
                return;
              } catch (e) {
                if (e?.response?.status == 401) return
                // console.error(e);
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
