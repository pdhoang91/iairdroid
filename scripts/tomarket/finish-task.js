import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { checkTask, claimClassmateStars, claimTask, getClassmateTask, getInvite, getTasks, login, startTask } from "../../utils/tomarket.js";
import { getAllTomarketAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const SKIP_TGE_TASK = true;
const SKIP_CLASSMATE_TASK = true;

const main = async () => {
  const secrets = await getAllTomarketAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                let access_token = await login(secret);
                let tasks = await getTasks(secret, access_token);
                let allTasks = Object.keys(tasks).flatMap((groupName) => tasks[groupName]?.default || tasks[groupName]  || [])
                // const classmateTask = await getClassmateTask(secret, access_token)
                secret.log(`${allTasks.length} tasks found`)
                for (const task of allTasks) {
                  let {
                    taskId,
                    name,
                    title,
                    score: taskBonusAmount,
                    status: taskStatus,
                    platform,
                    action,
                    type,
                    rankData,
                    checkCounter,
                    handleFunc,
                    visitLink,
                  } = task, retryCheck = 5;
                  // if (title?.includes?.("emoji")) {
                  //   console.log(task)
                  // }
                  if (action == "classmate" && SKIP_CLASSMATE_TASK) continue
                  if (SKIP_TGE_TASK && type == "emoji") continue
                  if (handleFunc && !["free_tomato", "bot"].includes(handleFunc)) continue
                  if (["mysterious"].includes(type)) continue
                  if (["invite"].includes(platform)) continue
                  if (platform == "telegram" && !visitLink && !title.includes("Play") && !title.includes("Free Tomato") && !title.includes("X")) continue
                  if (platform == "npc" && action == "checkInvite") {
                    const { total: totalInvite } = await getInvite(secret, access_token)
                    if (totalInvite < checkCounter) {
                      secret.log(`Not enough invite for task ${title}, require ${checkCounter}, having ${totalInvite}`)
                      continue;
                    }
                  }
                  // !["twitter", "youtube", "tiktok"].includes(platform)
                  if (type == "classmate" && !rankData && !SKIP_CLASSMATE_TASK) {
                    secret.log(`Claim starts`)
                    try {
                      const rankData = await claimClassmateStars(secret, access_token, taskId)
                      secret.log(`Claim stars success! Stars=${rankData.stars}, top=${rankData.top}`)
                      continue
                    } catch(e) {
                      if (e?.message?.includes?.("not within the valid time")) {
                        secret.log("Timeout, can not claim stars")
                        continue
                      }
                      throw e;
                    }
                  }
                  if (taskStatus == 0) {
                    let retry = 0;
                    while (retry < 3) {
                      try {
                        console.log(
                          `${secret.id} Start task ${title}`
                        );
                        const { status, message } = await startTask(
                          secret,
                          access_token,
                          taskId
                        );
                        if (status != 0) throw new Error(message)
                        taskStatus = 1;
                        retryCheck = 15;
                        break
                      } catch (e) {
                        retry++;
                        if (e?.message == "Task handle is not exist") {
                          secret.log(`Start task ${title} ERROR: ${e?.message}`);
                          break
                        }
                        secret.log(`ERROR: ${e?.message}`);
                      } finally {
                        await sleep(1)
                      }
                    }
                  }
                  if (taskStatus == 1) {
                    let retry = 0;
                    while (retry < retryCheck) {
                      try {
                        console.log(
                          `${secret.id} Check task ${title} (${retry})`
                        );
                        const status = await checkTask(
                          secret,
                          access_token,
                          taskId
                        );
                        switch (status) {
                          case 1:
                            retry++
                            continue
                          default:
                            retry = retryCheck;
                            taskStatus = status
                            break
                        }
                      } catch (e) {
                        retry++;
                        console.error(`${secret.id} ERROR: ${e?.message}`);
                        if (e?.message?.includes?.("Init data expired")) {
                          break
                        }
                      } finally {
                        await sleep(1)
                      }
                    }
                  }
                  if (taskStatus == 2) {
                    let retry = 0;
                    while (retry < 3) {
                      try {
                        console.log(
                          `${secret.id} Claim task ${title}`
                        );
                        const { message, status } = await claimTask(
                          secret,
                          access_token,
                          taskId
                        );
                        if (status != 0) throw new Error(message)
                        console.log(
                          `${secret.id} Claim task ${title} SUCCESS! +${taskBonusAmount} TOMATO`
                        );
                        break
                      } catch (e) {
                        retry++;
                        console.error(`${secret.id} ERROR: ${e?.message}`);
                      } finally {
                        await sleep(1)
                      }
                    }
                  }
                }
                return;
              } catch (e) {
                secret.error(e);
                if (e?.message == "Invalid Token.") return
              }
            }
          }
        })
    )
  );
};

main();
