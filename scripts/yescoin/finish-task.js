import { randomInt, sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllYescoinAddress } from "../../utils/wallet.js";
import {
  checkDailyTask,
  checkTask,
  claimCommonTaskBonus,
  claimDailyTaskBonus,
  claimDailyTaskReward,
  claimInviteTask,
  claimSignInTask,
  claimSkin,
  claimStopBonus,
  claimTaskReward,
  clickDailyTask,
  clickTask,
  finishCommonTask,
  finishSkinTask,
  finishUpgradeTask,
  getCommonTasks,
  getDailyPost,
  getDailyTasks,
  getInviteTasks,
  getRefCode,
  getSignInTasks,
  getSkinList,
  getSkinTasks,
  getStopBonus,
  getTaskBonus,
  getTaskList,
  getUpgradeTasks,
  getWallet,
  linkBinanceWallet,
  login,
} from "../../utils/yescoin.js";

const { exec } = newSemaphore(100);
const CLAIM_STOP_BONUS = false;

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
                if (CLAIM_STOP_BONUS) {
                  const {canClaimBonus, bonusAmount} = await getStopBonus(secret, access_token)
                  if (canClaimBonus) {
                    secret.log(`Claim ${bonusAmount} GOLD stop bonus`);
                    await claimStopBonus(secret, access_token);
                    secret.log(`Claim ${bonusAmount} GOLD stop bonus SUCCESS!`);
                  }
                }
                const commonTasks = await getCommonTasks(secret, access_token);
                for (const task of commonTasks) {
                  const {
                    taskId,
                    taskName,
                    taskDescription,
                    taskBonusAmount,
                    taskStatus,
                  } = task;
                  if (taskStatus == 0) {
                    let retry = 0;
                    while (retry < 3) {
                      try {
                        secret.log(
                          `Finish task ${taskName} (${taskDescription})`
                        );
                        const { code, message } = await finishCommonTask(
                          secret,
                          access_token,
                          taskId
                        );
                        if (code == 0) {
                          secret.log(
                            `Finish task ${taskName} (${taskDescription}) SUCCESS! +${taskBonusAmount} Gold`
                          );
                          break;
                        } else throw new Error(message);
                      } catch (e) {
                        retry++;
                        secret.error(e);
                      }
                    }
                  }
                }

                const { taskBonusBaseResponseList: upgradeTasks, userLevel } =
                  await getUpgradeTasks(secret, access_token);
                for (const task of upgradeTasks) {
                  const { taskId, taskBonusAmount, taskStatus, taskUserLevel } =
                    task;
                  if (taskUserLevel > userLevel) continue;
                  if (taskStatus == 0) {
                    let retry = 0;
                    while (retry < 3) {
                      try {
                        secret.log(
                          `Claim bonus for user level ${taskUserLevel}`
                        );
                        const { code, message } = await finishUpgradeTask(
                          secret,
                          access_token,
                          taskId
                        );
                        if (code == 0) {
                          secret.log(
                            `Claim bonus for user level ${taskUserLevel} SUCCESS! +${taskBonusAmount} Gold`
                          );
                          break;
                        } else throw new Error(message);
                      } catch (e) {
                        retry++;
                        secret.error(e);
                      }
                    }
                  }
                }

                const tasks = await getTaskList(secret, access_token);
                for (const task of tasks) {
                  let { taskStatus,
                    taskId,
                    reward,
                    name,
                    checkStatus,
                  } = task;
                  if (taskStatus == 0 && checkStatus == 0) {
                    // start
                    secret.log(
                      `Start task ${name}`
                    );
                    await clickTask(secret, access_token, taskId);
                    checkStatus = 2;
                    secret.log(
                      `Start task ${name} SUCCESS!`
                    );
                  }
                  if (checkStatus == 2) {
                    // check
                    secret.log(
                      `Check task ${name}`
                    );
                    const success = await checkTask(secret, access_token, taskId);
                    if (success) {
                      checkStatus = 1;
                      secret.log(
                        `Check task ${name} SUCCESS!`
                      );
                    }
                  }
                  if (taskStatus == 0 && checkStatus == 1) {
                    // start
                    secret.log(
                      `Claim task ${name}`
                    );
                    await claimTaskReward(secret, access_token, taskId);
                    secret.log(
                      `Claim task ${name} SUCCESS! +${reward} Gold`
                    );
                  }
                }

                const { dailyTaskFinishCount,
                  dailyTaskTotalCount,
                  dailyTaskFinishBonus,
                  dailyTaskBonusStatus,
                  commonTaskFinishCount,
                  commonTaskTotalCount,
                  commonTaskBonusStatus,
                  commonTaskFinishBonus } = await getTaskBonus(secret, access_token)
                if (commonTaskBonusStatus < 2 && commonTaskTotalCount <= commonTaskFinishCount) {
                  secret.log(
                    `Claim common task bonus`
                  );
                  await claimCommonTaskBonus(secret, access_token);
                  secret.log(
                    `Claim common task bonus SUCCESS! +${commonTaskFinishBonus} Gold`
                  );
                }

                if (dailyTaskBonusStatus < 2 && dailyTaskTotalCount <= dailyTaskFinishCount) {
                  secret.log(
                    `Claim daily task bonus`
                  );
                  await claimDailyTaskBonus(secret, access_token);
                  secret.log(
                    `Claim daily task bonus SUCCESS! +${dailyTaskFinishBonus} Gold`
                  );
                }

                const signInTasks = await getSignInTasks(secret, access_token);
                const todayTask = signInTasks.find(({ openIn, status }) => openIn == 0 && status == 1);
                if (todayTask) {
                  const { id, name, checkIn } = todayTask;
                  if (checkIn == 0) {
                    let address;
                    const addressList = await getWallet(secret, access_token);
                    address = addressList?.[0]?.friendlyAddress;
                    secret.log(`Get daily post`)
                    await getDailyPost(secret, access_token);
                    secret.log(`Get signin reward for ${name}`);
                    const { data, code, message } = await claimSignInTask(
                      secret,
                      access_token,
                      address,
                      id
                    );
                    if (code == 0) {
                      const { reward, status } = data;
                      secret.log(`Get signin reward for ${name} SUCCESS! +${reward} Gold`);
                    } else throw new Error(message);
                  }
                }

                const { totalRecords } = await getRefCode(secret, access_token)
                const inviteTasks = await getInviteTasks(secret, access_token);
                for (const inviteTask of inviteTasks) {
                  const { feature, taskBonusAmount, taskId, taskStatus } = inviteTask
                  if (taskStatus == 1) continue
                  const { inviteUserTaskCount } = JSON.parse(feature)
                  if (totalRecords >= inviteUserTaskCount) {
                    secret.log(`Claim invite task with ref count >= ${inviteUserTaskCount}`)
                    const success = await claimInviteTask(secret, access_token, taskId);
                    if (success) {
                      secret.log(`Claim invite task with ref count >= ${inviteUserTaskCount} SUCCESS! +${taskBonusAmount} Gold`)
                    }
                  }
                }

                const dailyTasks = await getDailyTasks(secret, access_token);
                for (const dailyTask of dailyTasks) {
                  let { missionStatus,
                    missionId,
                    reward,
                    name,
                    checkStatus,
                  } = dailyTask;
                  if (name?.toLowerCase()?.includes?.("invite") && totalRecords == 0) continue
                  if (missionStatus == 0 && checkStatus == 0) {
                    // start
                    secret.log(
                      `Start daily task ${name}`
                    );
                    await clickDailyTask(secret, access_token, missionId);
                    checkStatus = 2;
                    secret.log(
                      `Start daily task ${name} SUCCESS!`
                    );
                  }
                  if (checkStatus == 2) {
                    // check
                    secret.log(
                      `Check daily task ${name}`
                    );
                    const success = await checkDailyTask(secret, access_token, missionId);
                    if (success) {
                      checkStatus = 1;
                      secret.log(
                        `Check daily task ${name} SUCCESS!`
                      );
                    }
                  }
                  if (missionStatus == 0 && checkStatus == 1) {
                    // start
                    secret.log(
                      `Claim daily task ${name}`
                    );
                    const success = await claimDailyTaskReward(secret, access_token, missionId);
                    if (success) {
                      secret.log(
                        `Claim daily task ${name} SUCCESS! +${reward} Gold`
                      );
                    }
                  }
                }

                let doneSkinTask = true;
                while (true) {
                  doneSkinTask = true;
                  const { yesSummerList: skinList } = await getSkinList(secret, access_token);
                  for (const skin of skinList) {
                    const { skinId, skinName, skinStatus } = skin;
                    if (skinStatus != 0) continue;
                    const skinTasks = await getSkinTasks(secret, access_token, skinId);
                    const doneTasks = skinTasks.filter(({ taskStatus }) => taskStatus == 1);
                    if (doneTasks.length == skinTasks.length) {
                      secret.log(`Claim skin ${skinName}`)
                      const { code, message } = await claimSkin(secret, access_token, skinId);
                      if (code == 0) {
                        secret.log(
                          `Claim skin ${skinName} SUCCESS!`
                        );
                        continue
                      } else throw new Error(`Claim skin ${skinName} ERROR: ${message}`);
                    }
                    for (const task of skinTasks) {
                      const {
                        taskId,
                        taskName,
                        taskDescription,
                        taskBonusAmount,
                        taskStatus,
                        taskSpecialType
                      } = task;
                      if (taskStatus == 0) {
                        if (taskSpecialType == "Wallet") {
                          // secret.log(`task=${JSON.stringify(task)} `)
                          const address = (await secret.getWallet())?.address;
                          if (!address) {
                            secret.log("Missing seedphrase");
                            continue
                          }
                          const rawAddress = await secret.rawAddress();
                          const publicKey = await secret.publicKey();
                          const bounceAddress = address.toString();
                          if (taskName.includes("Binance")) {
                            secret.log(
                              `Link Binance wallet with address=${bounceAddress}, publicKey=${publicKey}, raw=${rawAddress}`
                            );
                            const {code, message} = await linkBinanceWallet(secret, access_token, bounceAddress, publicKey, rawAddress)
                            if (code == 0) {
                              secret.log(
                                `Link Binance wallet with address=${bounceAddress} SUCCESS!`
                              );
                            } else {
                              secret.log(`Link Binance wallet fail: ${message}`);
                              continue
                            }
                            await sleep(5);
                          }
                        }
                        if (taskName.includes("invite") && totalRecords == 0) continue
                        secret.log(
                          `Finish task ${taskName} (${taskDescription})`
                        );
                        const { code, message } = await finishSkinTask(secret, access_token, taskId)
                        if (code == 0) {
                          secret.log(
                            `Finish task ${taskName} (${taskDescription}) SUCCESS! +${taskBonusAmount} Gold`
                          );
                          doneSkinTask = false;
                          continue
                        } else if (["user invite count not enough", "not connect binance wallet", "task not exist"].includes(message)) {
                          secret.log(`Task ${taskName} (${taskDescription}) not done: ${message}`)
                        } else throw new Error(message);
                      }
                    }
                  }
                  if (doneSkinTask) break
                  await sleep(10);
                }

                return;
              } catch (e) {
                let sleepTime = 1;
                if (e?.response?.status == 429) {
                  sleepTime = randomInt(1, 5)
                }
                secret.log(`ERROR: ${e?.message}, sleep ${sleepTime} mins`);
                if (e?.message == "invalid code error") return
                await sleep(sleepTime);
              }
            }
          }
        })
    )
  );
};

main();
