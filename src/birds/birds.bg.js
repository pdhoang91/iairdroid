import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getWormStatus, getOrCreateUser, catchWorm, getEggGameStatus, getEggGameTurn, playEggGame, claimEggGame, getIncubateInfo, confirmIncubateUpgrade, upgradeIncubate, getTasks, getDoneTasks, finishTask, confirmCheckin, presignCheckin, getLatestCheckin, getWallet } from "../../utils/birds.js";
import { isDone, parseTgUserFromInitParams, randomInt, setDone, sleep } from "../../utils/helper.js";
import { checkinBird } from "../../utils/balance-birds.js";
import { getCurrentSui } from "../../utils/balance-ocean.js";
import { suiExec as reqExec } from "../common/common.bg.js";

const { exec } = newSemaphore(100);
const IGNORE_TASK = true;
const MIN_SUI = 0.007;

const checkinKey = (id) => `bird_checkin_${id}`;
export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-birds-${fileName}`, async (event) => {
    event.sender.send(`${fileName}-console`, `start-claim-birds-${fileName}`);

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
    let sleepTime = 2 * 60 * 60 * 1000;
    const setSleepTime = (time) => {
      if (time < sleepTime) sleepTime = time;
    };
    try {
      await exec(async () => {
        const { id } = parseTgUserFromInitParams(secret.privateKey);
        await getOrCreateUser(secret);
        let wormData = await getWormStatus(secret)

        if (wormData.status === "MINT_OPEN") {
          secret.log("Nhìn thấy sâu, bắt nó...");
          const mintData = await catchWorm(secret);
          if (mintData?.status === "WAITING") {
            secret.log("Bắt sâu thành công");
            setSleepTime(new Date(mintData.nextMintTime) - new Date());
            // const nextMintTime = DateTime.fromISO(mintData.nextMintTime);
            // const formattedNextMintTime = nextMintTime.toLocaleString(DateTime.DATETIME_FULL);
            // secret.log(`Lần bắt sâu tiếp theo: ${formattedNextMintTime}`);
          } else {
            secret.log("Bắt sâu thất bại");
          }
          wormData = await getWormStatus(secret)
        }
        if (wormData.status === "WAITING") {
          setSleepTime(new Date(wormData.nextMintTime) - new Date());
          // const nextMintTime = DateTime.fromISO(wormData.nextMintTime);
          // const formattedNextMintTime = nextMintTime.toLocaleString(DateTime.DATETIME_FULL);
          // secret.log(`Không thấy con sâu nào, lần bắt tiếp theo: ${formattedNextMintTime}`);
        } else {
          secret.log(`Trạng thái: ${wormData.status}`);
        }

        let totalReward = 0;
        let { turn } = await getEggGameStatus(secret)
        const turnResponse = await getEggGameTurn(secret)
        turn = turnResponse.turn;
        if (turn > 0) {
          secret.log(`Bắt đầu đập trứng: có ${turn} lượt`);
          while (turn > 0) {
            const playResult = await playEggGame(secret)
            const { result } = playResult;
            turn = playResult.turn;
            totalReward += result;
            secret.log(`Còn ${turn} lần đập trứng | Phần thưởng ${result}`);
          }
        }

        if (totalReward > 0) {
          const claimResult = await claimEggGame(secret)
          if (claimResult === true) {
            secret.log(`Claim thành công! Tổng phần thưởng: ${totalReward}`);
          } else {
            secret.log("Claim thất bại");
          }
        }

        try {
          let incubationInfo = await getIncubateInfo(secret)
          secret.log(`Cấp độ của trứng: ${incubationInfo.level}`);

          const currentTime = Date.now();
          const upgradeCompletionTime = incubationInfo.upgradedAt + ((incubationInfo.duration / incubationInfo.speed) * 60 * 60 * 1000);

          if (incubationInfo.status === "processing") {
            if (currentTime > upgradeCompletionTime) {
              let userClass = undefined;
              if (incubationInfo.level >= 31) {
                userClass = "wizard";
              }
              const confirmResult = await confirmIncubateUpgrade(secret, userClass);
              if (confirmResult === true) {
                secret.log("Hoàn thành nâng cấp");
                incubationInfo = await getIncubateInfo(secret);
              } else {
                secret.log("Xác nhận nâng cấp thất bại");
              }
            } else {
              // const remainingTime = Math.ceil((upgradeCompletionTime - currentTime) / (60 * 1000));
              setSleepTime(upgradeCompletionTime - new Date());
              // secret.log(`Đang trong quá trình nâng cấp. Thời gian còn lại: ${remainingTime} phút`);
            }
          }

          const { balance } = await getOrCreateUser(secret);
          if (incubationInfo.status === "confirmed" && incubationInfo.nextLevel && incubationInfo?.nextLevel?.level < 36) {
            if (balance >= incubationInfo.nextLevel.birds) {
              const upgradeInfo = await upgradeIncubate(secret);
              const upgradeCompletionTime = upgradeInfo.upgradedAt + ((upgradeInfo.duration / incubationInfo.speed) * 60 * 60 * 1000);
              const completionDateTime = new Date(upgradeCompletionTime);
              setSleepTime(completionDateTime - new Date());
              secret.log(`Bắt đầu nâng cấp lên level ${upgradeInfo.level}. Hoàn thành lúc: ${completionDateTime.toLocaleString()}`);
            } else {
              secret.log(`Không đủ birds để nâng cấp. Cần ${incubationInfo.nextLevel.birds} birds`);
            }
          } else if (incubationInfo.status === "confirmed") {
            secret.log("Đã đạt cấp độ tối đa");
          }
        } catch (error) {
          if (error?.response?.status === 400 && error?.response?.data === 'Start incubating your egg now') {
            secret.log("Bắt đầu ấp trứng ngay bây giờ.");
            const upgradeInfo = await upgradeIncubate(secret);
            const upgradeCompletionTime = upgradeInfo.upgradedAt + ((upgradeInfo.duration / incubationInfo.speed) * 60 * 60 * 1000);
            const completionDateTime = new Date(upgradeCompletionTime);
            setSleepTime(completionDateTime - new Date());
            secret.log(`Bắt đầu nâng cấp lên level ${upgradeInfo.level}. Hoàn thành lúc: ${completionDateTime.toLocaleString()}`);
          } else {
            throw error
          }
        }
        if (!IGNORE_TASK) {
          const taskCategories = await getTasks(secret);
          const allTasks = taskCategories.flatMap(project => project.tasks);

          const doneTasks = await getDoneTasks(secret);
          const completedTaskIds = doneTasks.map(task => task.taskId);

          const incompleteTasks = allTasks.filter(task => !completedTaskIds.includes(task._id));

          for (const task of incompleteTasks) {
            const joinTaskResponse = await finishTask(secret, task);
            if (joinTaskResponse.msg === "Successfully") {
              secret.log(`Làm nhiệm vụ ${task.title} thành công | phần thưởng: ${task.point}`);
            } else {
              secret.log(`Làm nhiệm vụ ${task.title} thất bại`);
            }
            await sleep(1);
          }
        }
        if (!isDone(checkinKey(id))) {
          secret.log("Kiểm tra checkin")
          try {
            await checkin(secret);
          } catch(e) {
            if (e?.response?.status == 400) {
              secret.error(e)
            } else {
              throw e;
            }
          }
          setDone(checkinKey(id), 8 * 60 * 60_000);
        }
      });
    } catch (e) {
      sleepTime = 60_000;
      secret.error(e);
      if (e?.response?.status == 429) {
        sleepTime = randomInt(2, 10) * 60_000;
      }
    } finally {
      if (sleepTime > 0) {
        secret.log(`Ngủ ${(sleepTime / (1000 * 60)).toFixed(0)} phút...`);
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
};

const checkin = async (secret) => {
  if (!secret.address) {
    secret.log("Không thể điểm danh vì không có seedphrase")
    return
  }
  let { address: bindedAddress } = await getWallet(secret);
  if (!bindedAddress) {
    secret.log("Không thể điểm danh vì chưa link ví")
    return
  }
  // if (secret.address != bindedAddress) {
  //   secret.log("Seedphrase không khớp với địa chỉ của account")
  //   return
  // }
  const latestCheckin = await getLatestCheckin(secret);
  const today = new Date();
  const todayInStr = `${today.getUTCFullYear()}-${today.getUTCMonth() + 1}-${today.getUTCDate()}`;
  if (latestCheckin?.date == todayInStr) {
    secret.log(`Already checkin for date ${latestCheckin.index} ${todayInStr}, +${latestCheckin.reward / 1_000_000_000} BIRD`);
    return
  }
  const sui = await reqExec(() => getCurrentSui(secret.address));
  if (sui < MIN_SUI) {
    secret.log(`Not having enough SUI, having ${sui} SUI`);
    return
  }
  secret.log(`Getting signature for date ${todayInStr}`)
  const { message, signature, token } = await presignCheckin(secret, secret.address);
  secret.log(`Checkin for date ${todayInStr}`);
  const txHash = await reqExec(() => checkinBird(secret, message, signature, todayInStr));
  secret.log(`Checkin for date ${todayInStr} SUCCESS!`);
  secret.log(`Confirm checkin with tx hash ${txHash}`);
  await confirmCheckin(secret, token, txHash);
  secret.log(`Confirm checkin SUCCESS!`);
}