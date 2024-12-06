import {
  finishDailyTask,
  finishFixTask,
  finishGroup1Task,
  finishTask,
  getDailyMissions,
  getGroup1Missions,
  getGroupMissions,
  getInfoMissions,
  getPartnerMissions,
  getPetInfo,
  getSummaryMissions,
  getWalkFindsMissions,
  login,
} from "../../utils/djdog.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllDjDogAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllDjDogAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                let { access_token } = await login(secret);
                const groupMissions = await getGroupMissions(
                  secret,
                  access_token
                );
                let taskList = groupMissions
                  ?.map(({ missionRows }) => missionRows)
                  ?.flat() || [];

                const walkFindsMissions = await getWalkFindsMissions(
                  secret,
                  access_token
                );
                taskList = [...taskList, ...walkFindsMissions];

                const partnerMissions = await getPartnerMissions(
                  secret,
                  access_token
                );
                taskList = [...taskList, ...partnerMissions];

                for (const task of taskList) {
                  const {
                    finished,
                    description,
                    taskId,
                    title,
                    reward,
                    tgChannelPath,
                    twitterId,
                  } = task;
                  if (finished) continue;

                  let retry = 0;
                  while (retry < 3) {
                    try {
                      console.log(
                        `${secret.id} Finish task ${title} (${description} | tg=${tgChannelPath} x=${twitterId})`
                      );
                      const { returnCode, returnDesc } = await finishTask(
                        secret,
                        access_token,
                        taskId
                      );
                      if (returnCode == 200) {
                        console.log(
                          `${secret.id} Finish task ${title} (${description}) SUCCESS! +${reward} Hit`
                        );
                        break;
                      } else throw new Error(returnDesc);
                    } catch (e) {
                      retry++;
                      console.error(`${secret.id} ERROR: ${e?.message}`);
                    }
                  }
                }

                const dailyMissions = await getDailyMissions(
                  secret,
                  access_token
                );
                for (const task of dailyMissions) {
                  const {id, finished, title, jumpPath, rewardAmount} = task;
                  if (finished) continue;

                  let retry = 0;
                  while (retry < 3) {
                    try {
                      console.log(
                        `${secret.id} Finish daily task ${title} (${jumpPath})`
                      );
                      const { returnCode, returnDesc } = await finishDailyTask(
                        secret,
                        access_token,
                        id
                      );
                      if (returnCode == 200) {
                        console.log(
                          `${secret.id} Finish daily task ${title} (${jumpPath}) SUCCESS! +${rewardAmount} Hit`
                        );
                        break;
                      } else throw new Error(returnDesc);
                    } catch (e) {
                      retry++;
                      console.error(`${secret.id} ERROR: ${e?.message}`);
                    }
                  }
                }

                // const summaryMissions = await getSummaryMissions(
                //   secret,
                //   access_token
                // );
                // for (const mission of summaryMissions) {
                //   const { locked, minLevel } = mission;
                // }

                const group1Missions = await getGroup1Missions(
                  secret,
                  access_token
                );
                for (const mission of group1Missions) {
                  const { taskId } = mission;
                  let retry = 0;
                  while (retry < 3) {
                    try {
                      console.log(`${secret.id} Finish task group1 ${taskId}`);
                      const { returnCode, returnDesc } = await finishGroup1Task(
                        secret,
                        access_token,
                        taskId
                      );
                      if (returnCode == 200) {
                        console.log(
                          `${secret.id} Finish task group1 ${taskId} SUCCESS!`
                        );
                        break;
                      } else throw new Error(returnDesc);
                    } catch (e) {
                      retry++;
                      console.error(`${secret.id} ERROR: ${e?.message}`);
                    }
                  }
                }

                const infoMission =
                  await getInfoMissions(secret, access_token);
                if (infoMission && !infoMission.joinOfficeSubscriptChannel) {
                  let retry = 0;
                  while (retry < 3) {
                    try {
                      console.log(
                        `${secret.id} Finish task joinOfficeSubscriptChannel`
                      );
                      const { returnCode, returnDesc } = await finishFixTask(
                        secret,
                        access_token,
                        2
                      );
                      if (returnCode == 200) {
                        console.log(
                          `${secret.id} Finish task joinOfficeSubscriptChannel SUCCESS!`
                        );
                        break;
                      } else throw new Error(returnDesc);
                    } catch (e) {
                      retry++;
                      console.error(`${secret.id} ERROR: ${e?.message}`);
                    }
                  }
                }
                if (infoMission && !infoMission.joinOfficeChatChannel) {
                  let retry = 0;
                  while (retry < 3) {
                    try {
                      console.log(
                        `${secret.id} Finish task joinOfficeChatChannel`
                      );
                      const { returnCode, returnDesc } = await finishFixTask(
                        secret,
                        access_token,
                        3
                      );
                      if (returnCode == 200) {
                        console.log(
                          `${secret.id} Finish task joinOfficeChatChannel SUCCESS!`
                        );
                        break;
                      } else throw new Error(returnDesc);
                    } catch (e) {
                      retry++;
                      console.error(`${secret.id} ERROR: ${e?.message}`);
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
