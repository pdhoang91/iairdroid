import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";
import {
  achieveQuest,
  callAdsgramApi,
  claimAdsIncomePeels,
  claimAdsIncomeSpeedup,
  claimLottery,
  claimQuest,
  claimQuestLottery,
  doClick,
  doLottery,
  doShare,
  doSpeedup,
  equipBanana,
  getAdsInfo,
  getBananaList,
  getFullBananaList,
  getLotteryInfo,
  getQuestList,
  getUserInfo,
  login,
} from "../../utils/banana.js";
import { DateTime } from "luxon";
import { isDone, parseTgUserFromInitParams, randomInt, setDone, sleep } from "../../utils/helper.js";

const { exec } = newSemaphore(100);
const checkTasksKey = (id) => `banana_checkTasks_${id}`;
const checkAdsKey = (id) => `banana_checkAds_${id}`;
export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-banana-${fileName}`, async (event) => {
    event.sender.send(`${fileName}-console`, `start-claim-banana-${fileName}`);

    const secrets = await getSecretsByFileName(fileName);
    event.sender.send(
      `${fileName}-console`,
      `Đã load ${secrets.length} địa chỉ!`
    );
    await Promise.all(
      secrets.map(async (secret) => {
        secret.log = (msg) => {
          msg = `${secret.id}${secret.proxy ? " (proxy)" : ""} ${msg}`;
          event.sender.send(`${fileName}-console`, msg);
          console.log(msg);
        };
        secret.error = (e) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${e?.status ? ` (status=${e?.status})` : ""
            }: ${e?.response?.data?.message ||
            e?.data?.message ||
            e?.message ||
            e?.name ||
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

const DEFAULT_TIME = 1_000_000_000_000;

const startClaim = async (secret) => {
  while (true) {
    let waitTime = DEFAULT_TIME;
    try {
      await exec(async () => {
        const { id: tgUserId } = parseTgUserFromInitParams(secret.privateKey);
        let remainingTimeMinutes = Infinity;
        const token = await login(secret);
        if (token) {
          if (!isDone(checkAdsKey(tgUserId))) {
            secret.log("Kiểm tra phần thưởng ads");
            const { show_for_peels, show_for_speedup } = await getAdsInfo(secret, token);
            if (show_for_peels || show_for_speedup) {
              secret.log(`Gọi API adsgram`)
              const success = await callAdsgramApi(secret)
              if (success) {
                secret.log(`Gọi API adsgram thành công!`)
              } else {
                secret.log(`Gọi API adsgram thất bại!`)
              }
              await sleep(1);
            }
            if (show_for_speedup) {
              try {
                secret.log("Claim phần thưởng ads speedup");
                const { income, peels, speedup } = await claimAdsIncomeSpeedup(
                  secret,
                  token
                );
                secret.log(
                  `Claim phần thưởng ads speedup thành công! +${income} USDT, +${peels} peels, +${speedup} BaBoost`
                );
              } catch (e) {
                if (!["Already claimed for harvest"].includes(e?.message)) throw ee;
                secret.log("Claim phần thưởng ads speedup thất bại");
              }

            }
            if (show_for_peels) {
              try {
                secret.log("Claim phần thưởng ads peels");
                const { income, peels, speedup } = await claimAdsIncomePeels(
                  secret,
                  token
                );
                secret.log(
                  `Claim phần thưởng ads peels thành công! +${income} USDT, +${peels} peels, +${speedup} BaBoost`
                );
              } catch (e) {
                if (!["Already claimed for harvest"].includes(e?.message)) throw e;
                secret.log("Claim phần thưởng ads peels thất bại");
              }

            }
            setDone(checkAdsKey(tgUserId))
          }
          const userInfo = await getUserInfo(secret, token);
          const peel = userInfo.peel || "N/A";
          const usdt = userInfo.usdt || "N/A";
          const todayClickCount = userInfo.today_click_count || 0;
          const maxClickCount = userInfo.max_click_count || 0;
          const currentEquipBananaId = userInfo.equip_banana_id || 0;
          const speedupCount = userInfo.speedup_count;

          secret.log(
            `Balance : ${peel}` +
            `, USDT : ${usdt}` +
            `, Hôm nay đã tap : ${todayClickCount} lần`
          );
          const lotteryInfoData = await getLotteryInfo(secret, token);

          remainingTimeMinutes = calculateRemainingTime(lotteryInfoData || {});

          if (remainingTimeMinutes <= 0) {
            secret.log("Bắt đầu claim...");
            await claimLottery(secret, token);

            const updatedLotteryInfoData = await getLotteryInfo(secret, token);
            remainingTimeMinutes = calculateRemainingTime(
              updatedLotteryInfoData || {}
            );
            waitTime = remainingTimeMinutes * 60 * 1000;
          } else {
            waitTime = remainingTimeMinutes * 60 * 1000;
          }
          if (remainingTimeMinutes > 4 * 60 && speedupCount > 0) {
            secret.log(`Giảm 1/2 thời gian chờ`);
            await doSpeedup(secret, token);
            waitTime = (remainingTimeMinutes / 2) * 60 * 1000;
          }

          let remainLotteryCount =
            (lotteryInfoData || {}).remain_lottery_count || 0;
          while (remainLotteryCount > 0) {
            secret.log("Harvest...");
            const { banana_info: lotteryResult } = await doLottery(secret, token);
            const newBananaId = lotteryResult.banana_id;
            const bananaName = lotteryResult.name || "N/A";
            const sellExchangePeel = lotteryResult.sell_exchange_peel || "N/A";
            const sellExchangeUsdt = lotteryResult.sell_exchange_usdt || "N/A";

            secret.log(`Harvest ${bananaName} thành công (${sellExchangePeel} banana, ${sellExchangeUsdt} usdt)`);
            await doShare(secret, token, newBananaId);
            secret.log(
              `Share bana ${bananaName} (id=${newBananaId}) thành công`
            );
            remainLotteryCount--;
          }
          await equipBestBanana(secret, token, currentEquipBananaId);

          if (todayClickCount < maxClickCount) {
            const clickCount = maxClickCount - todayClickCount;
            if (clickCount > 0) {
              secret.log(`Đã tap ${clickCount} lần...`);
              await doClick(secret, token, clickCount);
              waitTime = 0;
            } else {
              console.log("Không thể tap, đã đạt giới hạn tối đa!");
            }
          }

          if (!isDone(checkTasksKey(tgUserId))) {
            const questListData = await getQuestList(secret, token);

            const questList = questListData?.data?.list || [];
            for (let i = 0; i < questList.length; i++) {
              let printQuest = false;
              const quest = questList[i];
              const questName = quest.quest_name || "N/A";
              let isAchieved = quest.is_achieved || false;
              let isClaimed = quest.is_claimed || false;
              const questId = quest.quest_id;

              if (!isAchieved) {
                await achieveQuest(secret, token, questId);

                const updatedQuestListData = await getQuestList(secret, token);
                const updatedQuest = updatedQuestListData?.data?.list.find(
                  (q) => q.quest_id === questId
                );
                isAchieved = updatedQuest.is_achieved || false;
              }

              if (isAchieved && !isClaimed) {
                await claimQuest(secret, token, questId);
                printQuest = true;

                const updatedQuestListData = await getQuestList(secret, token);
                const updatedQuest = updatedQuestListData?.data?.list.find(
                  (q) => q.quest_id === questId
                );
                isClaimed = updatedQuest?.is_claimed || false;
              }
              if (!printQuest) continue;

              const achievedStatus = isAchieved ? "Hoàn thành" : "Thất bại";
              const claimedStatus = isClaimed ? "Đã Claim" : "Chưa Claim";

              if (!questName.toLowerCase().includes("bind")) {
                secret.log(
                  `${`Làm nhiệm vụ `}${questName} ${"..."}Trạng thái : ${achievedStatus} | ${claimedStatus}`
                );
              }
            }

            const progress = questListData.data.progress || "";
            const isClaimedQuestLottery = questListData?.data?.is_claimed || false;

            if (isClaimedQuestLottery) {
              secret.log(`Claim quest có sẵn: ${progress}`);
              await claimQuestLottery(
                secret,
                token
              );
              secret.log("Claim quest thành công!");
            }
            setDone(checkTasksKey(tgUserId), 24 * 60 * 60_000);
          }
        }
      });
    } catch (e) {
      secret.error(e);
      waitTime = 10000;
      if (e?.response?.status == 500) {
        waitTime = randomInt(1, 3) * 60_000;
      }
      if (e?.response?.status == 429 || e?.response?.status == 403) {
        waitTime = randomInt(1, 5) * 60_000;
      }
    } finally {
      if (waitTime == DEFAULT_TIME) {
        waitTime = 60_000; // 60s
      }
      if (waitTime > 0) {
        secret.log(`Ngủ ${(waitTime / (60 * 1000)).toFixed(0)} phút... `);
      }
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
};

function calculateRemainingTime(lotteryData) {
  const lastCountdownStartTime = lotteryData.last_countdown_start_time || 0;
  const countdownInterval = lotteryData.countdown_interval || 0;
  const countdownEnd = lotteryData.countdown_end || false;

  if (!countdownEnd) {
    const currentTime = DateTime.now();
    const lastCountdownStart = DateTime.fromMillis(lastCountdownStartTime);
    const elapsedTime = (
      (currentTime - lastCountdownStart) /
      (60 * 1000)
    ).toFixed(0);
    const remainingTimeMinutes = Math.max(countdownInterval - elapsedTime, 0);
    return remainingTimeMinutes;
  }
  return 0;
}

async function equipBestBanana(secret, token, currentEquipBananaId) {
  const bananas = await getFullBananaList(secret, token);

  const eligibleBananas = bananas.filter((banana) => banana.count >= 1);
  if (eligibleBananas.length > 0) {
    const bestBanana = eligibleBananas.reduce((prev, current) => {
      return prev.daily_peel_limit > current.daily_peel_limit ? prev : current;
    });

    if (bestBanana.banana_id === currentEquipBananaId) {
      return;
    }
    await equipBanana(secret, token, bestBanana.banana_id);
    secret.log(
      `Đã Equip quả chuối tốt nhất: ${bestBanana.name} với ${bestBanana.daily_peel_limit} 🍌/ DAY`
    );
  } else {
    secret.log("Không có quả chuối nào được tìm thấy !");
  }
}
