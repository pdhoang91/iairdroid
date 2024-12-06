import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { isDone, parseTgUserFromInitParams, randomInt, setDone, sleep } from "../../utils/helper.js";
import {
  checkBalanceFriend,
  checkDailyReward,
  claimBalance,
  claimBalanceFriend,
  claimGame,
  claimTask,
  getBalance,
  getTasks,
  getUserInfo,
  login,
  playGame,
  startFarming,
  startTask,
} from "../../utils/blum.js";
import { DateTime } from "luxon";

const { exec } = newSemaphore(100);
const MAX_RETRY = 3;
const USE_TICKET = false;
const checkTasksKey = (id) => `blum_checkTasks_${id}`

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-blum-${fileName}`, async (event) => {
    event.sender.send(`${fileName}-console`, `start-claim-blum-${fileName}`);

    const secrets = await getSecretsByFileName(fileName);
    event.sender.send(
      `${fileName}-console`,
      `Đã load ${secrets.length} địa chỉ!`
    );
    await Promise.all(
      secrets.map(async (secret) => {
        secret = { ...secret };
        secret.log = (msg) => {
          msg = `${secret.id}${secret.proxy ? " (proxy)" : ""} ${msg}`;
          event.sender.send(`${fileName}-console`, msg);
          console.log(msg);
        };
        secret.error = (e) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${e?.status ? `(status=${e?.status})` : ""
            }: ${e?.response?.data?.message ||
            e?.data?.message ||
            e?.message ||
            JSON.stringify(e)
            }`
          );
          console.error(e);
        };
        await startClaim(secret);
      })
    );
  });
};

const startClaim = async (secret) => {
  while (true) {
    let sleepTime = 12 * 60 * 60 * 1000;
    const setSleepTime = (time) => {
      if (time < sleepTime) sleepTime = time;
    };
    try {
      const { id } = parseTgUserFromInitParams(secret.privateKey);
      // if (!username) {
      //   setSleepTime(0);
      //   secret.log(
      //     `Không có username, phải đăng ký username để chơi game. Bỏ theo dõi tài khoản này`
      //   );
      //   return;
      // }
      await exec(async () => {
        await login(secret);
        const userInfo = await getUserInfo(secret);
        if (userInfo === null) {
          secret.log(
            "Không thể lấy thông tin người dùng, bỏ qua tài khoản này"
          );
          return;
        }
        const dailyRewardResult = await checkDailyReward(secret);
        if (dailyRewardResult) {
          secret.log("Đã nhận phần thưởng hàng ngày!");
        }

        const balanceInfo = await getBalance(secret);
        secret.log(
          `Số dư=${balanceInfo.availableBalance}, Vé chơi game=${balanceInfo.playPasses}`
        );
        if (!balanceInfo.farming) {
          const farmingResult = await startFarming(secret);
          if (farmingResult) {
            secret.log("Đã bắt đầu farming thành công!");
          }
        } else {
          const endTime = DateTime.fromMillis(balanceInfo.farming.endTime);
          const formattedEndTime = endTime
            .setZone("Asia/Ho_Chi_Minh")
            .toFormat("dd/MM/yyyy HH:mm:ss");
          secret.log(`Thời gian hoàn thành farm: ${formattedEndTime}`);
          const currentTime = DateTime.now();
          if (currentTime > endTime) {
            const claimBalanceResult = await claimBalance(secret);
            if (claimBalanceResult) {
              secret.log("Claim farm thành công!");
            }
            secret.log("Bắt đầu farming");
            await startFarming(secret);
          }
        }
        if (!isDone(checkTasksKey(id))) {
          const taskListResponse = await getTasks(secret);

          if (
            taskListResponse &&
            Array.isArray(taskListResponse) &&
            taskListResponse.length > 0
          ) {
            let allTasks = taskListResponse.flatMap(
              (section) => {
                let tasks = section.tasks || []
                if (section.subSections) {
                  tasks = [...section.subSections.flatMap(({ tasks }) => tasks), ...tasks]
                }
                return tasks
              }
            ).flatMap((task) => task.subTasks ? [...task.subTasks, task] : [task]);

            // const excludedTaskKind = "ONGOING";
            // allTasks = allTasks.filter(task => task.title !== "Farm");
            const notStartedTasks = allTasks.filter(
              (task) => task.status === "NOT_STARTED"
            );
            secret.log(
              `[*] Tổng số nhiệm vụ=${allTasks.length}, Nhiệm vụ chưa bắt đầu=${notStartedTasks.length}`
            );
            for (const task of allTasks) {
              if (task.status === "FINISHED") continue;
              if (
                !["PROGRESS_TARGET", "ONCHAIN_TRANSACTION"].includes(task.type) &&
                task.validationType != "KEYWORD" &&
                task.status === "NOT_STARTED" &&
                task.kind != "QUEST"
              ) {
                let retry = 0;
                while (retry < MAX_RETRY) {
                  retry++;
                  try {
                    secret.log(`Bắt đầu nhiệm vụ: ${task.title} (${retry})`);
                    const startResult = await startTask(secret, task.id);
                    if (!startResult) {
                      secret.log(`Không thể bắt đầu nhiệm vụ: ${task.title}`);
                      break;
                    }
                    await sleep(1);
                    break;
                  } catch (e) {
                    if (e?.response?.data?.message == "Task is already started") {
                      break
                    } else {
                      secret.error(e);
                      await sleep(1);
                    }

                  }
                }
              }
              // if (task.type == "PROGRESS_TARGET" && task.progressTarget.progress < task.progressTarget.target) continue
              if (task.status === "READY_FOR_CLAIM") {
                let retry = 0;
                while (retry < MAX_RETRY) {
                  retry++;
                  try {
                    secret.log(`Làm nhiệm vụ ${task.title} (${retry})`);
                    const claimResult = await claimTask(secret, task.id);
                    if (claimResult && claimResult?.status === "FINISHED") {
                      secret.log(
                        `Làm nhiệm vụ ${task.title}... trạng thái: thành công!`
                      );
                      break;
                    }
                    break;
                  } catch (e) {
                    if (e?.response?.data?.message == "Task is already claimed") {
                      break
                    } else {
                      secret.error(e);
                      await sleep(1);
                    }
                  }
                }
              }
            }
          } else {
            secret.log(
              "Không thể lấy danh sách nhiệm vụ hoặc danh sách nhiệm vụ trống"
            );
          }
          setDone(checkTasksKey(id), 12 * 60 * 60_000);
        }

        try {
          const friendBalanceInfo = await checkBalanceFriend(secret);

          secret.log(`Số dư bạn bè: ${friendBalanceInfo.amountForClaim}`);
          if (friendBalanceInfo.amountForClaim > 0) {
            const claimFriendBalanceResult = await claimBalanceFriend(secret);
            if (claimFriendBalanceResult) {
              secret.log("Đã nhận số dư bạn bè thành công!");
            }
          }
        } catch (e) {
          if (e?.response?.status == 404) {
            secret.log(`Lỗi: user chưa có, không claim được số dư bạn bè`)
          } else throw e;
        }

        if (balanceInfo && balanceInfo.playPasses > 0 && USE_TICKET) {
          for (let j = 0; j < balanceInfo.playPasses; j++) {
            let retry = 0,
              gameId, gameAssets;
            while (retry < MAX_RETRY) {
              retry++;
              try {
                secret.log(
                  `Bắt đầu chơi game lần thứ ${j + 1}/${balanceInfo.playPasses
                  }... (${retry})`
                );
                const data = await playGame(secret);
                if (data) {
                  gameId = data.gameId;
                  gameAssets = { ...data.assets };
                  delete gameAssets["BOMB"];
                  delete gameAssets["FREEZE"];
                  secret.log(`Tỉ lệ rơi: ${Object.keys(gameAssets).map((name) => {
                    const { probability } = gameAssets[name]
                    return `${name} ${(parseFloat(probability) * 100).toFixed(2)}%`
                  }).join(", ")}`)
                  await sleep(30);
                } else {
                  gameId = data;
                }
                break;
              } catch (e) {
                secret.error(e);
                await sleep(1);
              }
            }
            if (gameId === false) break;
            if (!gameId) {
              j--;
              continue;
            }
            retry = 0;
            while (true) {
              retry++;
              try {
                const bp = randomInt(220, 270), dogsPoint = gameAssets["DOGS"] ? randomInt(200, 250) : null;
                secret.log(`Nhận phần thưởng game lần thứ ${j + 1} với ${bp} BP${dogsPoint ? `, ${dogsPoint} DOG` : ""} (${gameId}) (${retry})`);
                const claimGameResult = await claimGame(secret, gameId, bp, dogsPoint);
                if (claimGameResult) {
                  secret.log(
                    `Đã nhận phần thưởng game lần thứ ${j + 1} (${gameId}) thành công! +${bp} BP${dogsPoint ? `, +${dogsPoint} DOG` : ""}`
                  );
                }
                break;
              } catch (e) {
                secret.error(e);
                await sleep(1);
              }
            }
          }
        }
        if (balanceInfo.farming) {
          if (balanceInfo.farming.endTime > new Date()) {
            setSleepTime(balanceInfo.farming.endTime - new Date());
          } else {
            setSleepTime(0)
          }
        }
      });
    } catch (e) {
      sleepTime = 60 * 1000;
      secret.error(e);
    } finally {
      if (sleepTime > 0) {
        secret.log(`Ngủ ${(sleepTime / (1000 * 60)).toFixed(1)} phút...`);
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
};
