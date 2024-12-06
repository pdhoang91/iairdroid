import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPawsAddress } from "../../utils/wallet.js";
import { checkTask, claimTask, getTaskList, login } from "../../utils/paws.js";
import { sleep } from "../../utils/helper.js";

const { exec } = newSemaphore(200);

const main = async () => {
  let secrets = await getAllPawsAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                await login(secret);
                const taskList = await getTaskList(secret);
                for (const task of taskList) {
                  const {
                    _id,
                    title,
                    description,
                    type,
                    action,
                    rewards,
                    counter,
                    data,
                    code,
                    progress,
                  } = task;
                  if (["boost"].includes(code)) continue;
                  if (action == "link" && code == "telegram") continue;
                  if (code == "invite" && progress.current < counter) continue;
                  if (progress.claimed) continue;
                  if (progress.current < counter) {
                    secret.log(`Check task ${title}`);
                    const done = await checkTask(secret, _id);
                    if (done) {
                      progress.current = counter;
                    }
                  }
                  if (progress.current == counter) {
                    secret.log(`Claim task ${title}`);
                    let success = await claimTask(secret, _id);
                    if (typeof success == "object") {
                      if (success?.amount) {
                        rewards.push({
                          code: "balance",
                          amount: success.amount,
                        });
                      }
                      success = success?.status;
                    }
                    if (success) {
                      secret.log(
                        `Claim task ${title} SUCCESS! ${rewards
                          ?.filter(({ amount }) => amount)
                          ?.map?.(({ code, amount }) => `+${amount} ${code}`)
                          ?.join(", ")}`
                      );
                    } else {
                      secret.log(`Claim task ${title} FAIL!`);
                    }
                  }
                }
                return;
              } catch (e) {
                // console.error(e);
                secret.error(e);
                await sleep(1);
              }
            }
          }
        })
    )
  );
};

main();
