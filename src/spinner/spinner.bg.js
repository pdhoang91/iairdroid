import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import {
  activateRocket,
  autoClick,
  checkRequirement,
  getSpinnerBoxes,
  getSpinnerInitData,
  openSpinnerBox,
  register,
  repairSpinner,
  selectSpinner,
  tapSpinner,
  upgradeSpinner,
  useSpinnerFullHp,
} from "../../utils/spinner.js";
import { JSONStringtify, isDone, parseTgUserFromInitParams, setDone } from "../../utils/helper.js";

const { exec } = newSemaphore(100);
const TAP_PER_TIME = 5,
  INIT_FINAL_NEXT_TIME = 12 * 60 * 60_000;
const MAX_LEVEL = 20;
const checkTasksKey = (id) => `spinner_checkTasks_${id}`;

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-spinner-${fileName}`, async (event) => {
    const secrets = await getSecretsByFileName(fileName);
    event.sender.send(
      `${fileName}-console`,
      `Đã load ${secrets.length} địa chỉ!`
    );
    await Promise.all(
      secrets.map(async (secret) => {
        secret = { ...secret };
        secret.log = (msg) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} ${msg}`
          );
          console.log(msg);
        };
        secret.error = (e) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${e?.status ? ` (status=${e?.status})` : ""
            }: ${e?.response?.data?.message ||
            e?.data?.message ||
            e?.message ||
            JSONStringtify(e)
            }`
          );
          console.error(e);
        };
        await runCron(secret);
      })
    );
  });
};

const runCron = async (secret) => {
  while (true) {
    let sleepTime = 12 * 60 * 60_000;
    const setSleepTime = (time) => {
      if (time < sleepTime) sleepTime = time;
    };
    try {
      await exec(async () => {
        const { id } = parseTgUserFromInitParams(secret.privateKey);
        await register(secret);
        if (!isDone(checkTasksKey(id))) {
          await finishTask(secret);
          setDone(checkTasksKey(id), 12 * 60 * 60_000)
        }
        await upgradeLevel(secret);
        let { spinners, user } = await getSpinnerInitData(secret);
        let { mainSpinnerId, fullhpAmount, rocketsAmount } = user;
        if (spinners.length == 0) {
          finalNextTime = 0;
          secret.log(`Không có spinner, dừng tap`);
          return;
        }
        if (user.isBanned == 1) {
          secret.log("User đã bị ban, ko tap được");
          return
        }
        secret.log(`Kiểm tra ${spinners.length} spinner`);
        for (const spinner of spinners) {
          let {
            id: spinnerId,
            hp,
            spinnerStats,
            endRepairTime,
            isBroken,
            level,
          } = spinner;
          let earnPerTap = spinnerStats.turbospin;
          let nextTime = INIT_FINAL_NEXT_TIME,
            isRepairSpinner = true;
          if (isBroken) {
            if (endRepairTime) {
              nextTime = new Date(endRepairTime) - new Date();
              isRepairSpinner = false;
            }
          }
          if (
            !isBroken ||
            (isBroken && nextTime < 0 && spinnerId != mainSpinnerId)
          ) {
            if (spinnerId != mainSpinnerId) {
              secret.log(`Chọn spinner ${spinnerId} làm spinner chính`);
              await selectSpinner(secret, spinnerId);
              let { spinners } = await getSpinnerInitData(secret);
              let newSpinerData = spinners.find(({ id }) => id == spinnerId);
              if (!newSpinerData) {
                continue;
              }
              hp = newSpinerData.hp;
              mainSpinnerId = spinnerId;
            }
            let tap = (hp / earnPerTap).toFixed(0);
            let tapTime = TAP_PER_TIME;
            while (tap > 0) {
              if (tap < TAP_PER_TIME) {
                tapTime = tap;
              }
              if (tapTime <= 0) {
                break;
              }
              secret.log(`Đang tap spinner ${spinnerId} ${tapTime} lần, còn ${tap - tapTime} lần`);
              const res = await tapSpinner(secret, tapTime);
              if (res) {
                hp -= tapTime * earnPerTap;
                tap = (hp / earnPerTap).toFixed(0);
              }
            }
            isRepairSpinner = true;
          }
          // open box
          if (spinnerId == mainSpinnerId) {
            const boxes = await getSpinnerBoxes(secret);
            for (const box of boxes) {
              const { open_time } = box;
              var sod = new Date();
              sod.setUTCHours(0, 0, 0, 0);
              if (!open_time || (open_time && new Date(open_time) < sod)) {
                secret.log(`Mở box #${box.id} ${box.name}`);
                const result = await openSpinnerBox(secret, box.id);
                if (result.fullHp) {
                  secret.log(
                    `Box ${box.id} được ${result.fullHp} lần hồi mana`
                  );
                  fullhpAmount++;
                } else if (result.tokens) {
                  secret.log(`Box ${box.id} ăn ${result.tokens} token`);
                } else if (result.xBonus) {
                  secret.log(
                    `Box ${box.id} ăn bonus ${JSON.stringify(result.xBonus)}`
                  );
                }
              }
            }
            if (fullhpAmount > 0) {
              secret.log(`Đang dùng full hp`);
              await useSpinnerFullHp(secret, spinnerId);
              nextTime = 0;
              isRepairSpinner = false;
            }
          }
          // use rocket
          while (level >= 20 && rocketsAmount > 0) {
            secret.log(
              `Đang kích hoạt Rocket cho spinner ${spinnerId}, còn lại ${rocketsAmount - 1} rocket`
            );
            await activateRocket(secret, spinnerId);
            let rocketFinished = false;
            setTimeout(() => {
              rocketFinished = true;
            }, 10000);
            while (true) {
              if (rocketFinished) break;
              try {
                secret.log(
                  `(Rocket) Đang tap spinner ${spinnerId} ${TAP_PER_TIME} lần`
                );
                await tapSpinner(secret, TAP_PER_TIME);
              } catch (e) {
                secret.error(e);
              }
            }
            secret.log(`(Rocket) Đã hết thời gian`);
            rocketsAmount--;
          }
          if (isRepairSpinner) {
            if (spinnerId != mainSpinnerId) {
              secret.log(`Chọn spinner ${spinnerId} làm spinner chính`);
              await selectSpinner(secret, spinnerId);
            }
            secret.log(`Đang sửa spinner ${spinnerId}`);
            await repairSpinner(secret);
            nextTime = 0;
          }
          setSleepTime(nextTime);
        }
      });
    } catch (e) {
      secret.error(e);
      sleepTime = 60_000;
    } finally {
      if (sleepTime > 0) {
        secret.log(`Tap sau ${(sleepTime / 60_000).toFixed(2)} phút`);
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
};

const finishTask = async (secret) => {
  secret.log("Kiểm tra task")
  let { sections } = await getSpinnerInitData(secret);
  for (const section of sections) {
    for (const task of section.tasks) {
      for (const requirement of task.requirements) {
        let success = false,
          reward;
        try {
          let result = await checkRequirement(secret, requirement.id);
          success = result.success;
          reward = result.reward;
        } catch (e) {
          if (e?.response?.status != 400) {
            secret.log(
              `[${e?.response?.status}] Task ${requirement.name
              } lỗi: ${e?.response?.data?.message || e?.message}`
            );
          } else {
            // console.error(`${secret.id} Requirement ${requirement.name} error: ${e?.response?.data?.message || e?.message}`)
          }
        }
        if (success) {
          secret.log(
            `Claim task ${requirement.name} thành công, phần thưởng: ${reward}`
          );
        }
      }
    }
  }
}

const upgradeLevel = async (secret) => {
  secret.log("Kiểm tra spinner có thể nâng cấp");
  let { user, spinners, levels } = await getSpinnerInitData(secret);
  let { mainSpinnerId } = user;
  spinners.sort((s1, s2) => s2.level - s1.level);
  for (const currentSpinner of spinners) {
    const getNextLevel = (currentLvl) => {
      return levels.find(
        ({ level }) => level == currentLvl + 1 && level <= MAX_LEVEL
      );
    };
    let currentLevel = currentSpinner.level;

    while (true) {
      const nextLevel = getNextLevel(currentLevel);
      if (nextLevel && user.balance > nextLevel.price) {
        secret.log(
          `(Balance = ${user.balance}) Nâng cấp spinner ${currentSpinner.id} lên level ${nextLevel.level} (giá ${nextLevel.price})`
        );
        try {
          if (currentSpinner.id != mainSpinnerId) {
            secret.log(
              `Chọn spinner mặc định ${currentSpinner.id}`
            );
            await selectSpinner(secret, currentSpinner.id);
            mainSpinnerId = currentSpinner.id;
          }
          await autoClick(
            secret,
            true,
            async (fn) => await fn(),
            false
          );
          await upgradeSpinner(secret, currentSpinner.id);
          currentLevel++;
          await autoClick(secret, true);
          let newData = await getSpinnerInitData(secret);
          user = newData.user;
        } catch (e) {
          secret.error(e);
        }
      } else {
        break;
      }
    }
  }
}