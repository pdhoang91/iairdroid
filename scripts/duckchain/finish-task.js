import { getAllDuckchainAddress } from "../../utils/wallet.js";
import { newSemaphore } from "../../utils/semaphore.js";
import {
  claimAirdropNft,
  claimEgg,
  dailyCheckin,
  finishTask,
  getAvailableNftAirdrops,
  getDoneTasks,
  getTaskList,
  isClaimedEgg,
} from "../../utils/duckchain.js";

const { exec } = newSemaphore(400);
const MAX_RETRY = 3;
const CLAIM_EGG = true;
const CLAIM_AIRDROP_NFT = true;

const main = async () => {
  const secrets = await getAllDuckchainAddress();
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            try {
              if (CLAIM_EGG) {
                const claimed = await isClaimedEgg(secret)
                if (!claimed) {
                  secret.log("Claim 10 egg");
                  const success = await claimEgg(secret);
                  if (success) {
                    secret.log("Claim 10 egg SUCCESS!");
                  } else {
                    secret.log("Claim 10 egg FAIL!");
                  }
                }
              }
              if (CLAIM_AIRDROP_NFT) {
                const availableAirdrops = await getAvailableNftAirdrops(secret)
                for (const nftAirdrop of availableAirdrops) {
                  secret.log(`Claim Airdrop NFT ${nftAirdrop.nftName}`);
                  const success = await claimAirdropNft(secret, nftAirdrop.Id);
                  if (success) {
                    secret.log(`Claim Airdrop NFT ${nftAirdrop.nftName} SUCCESS!`);
                  } else {
                    secret.log(`Claim Airdrop NFT ${nftAirdrop.nftName} FAIL!`);
                  }
                }
              }
              const taskMap = await getTaskList(secret);
              const doneTasksMap = await getDoneTasks(secret);
              for (const categoryType of Object.keys(taskMap)) {
                const taskList = taskMap[categoryType];
                const doneTasks = doneTasksMap[categoryType];
                const notDoneTasks = taskList.filter(
                  ({ taskId }) => !doneTasks.includes(taskId)
                );
                if (notDoneTasks.length == 0) continue;
                secret.log(
                  `Found ${notDoneTasks.length} not done ${categoryType} tasks`
                );
                for (const task of notDoneTasks) {
                  const { taskId, content, action, integral, icon_url, type, taskType } =
                    task;
                  if (taskType == "daily_check_in") {
                    secret.log("Checkin daily");
                    const success = await dailyCheckin(secret)
                    if (success) {
                      secret.log(`Checkin daily success! + ${integral} DUCK`);
                    } else {
                      secret.log(`Checkin daily fail!`);
                    }
                    continue
                  }
                  if (action?.includes?.("t.me")) continue
                  secret.log(`Finish task ${content} (${categoryType})`);
                  const success = await finishTask(
                    secret,
                    categoryType,
                    taskId
                  );
                  if (success) {
                    secret.log(
                      `Finish task ${content} (${categoryType}) SUCCESS! +${integral} DUCK`
                    );
                  }
                }
              }
              return;
            } catch (e) {
              retry++;
              console.error(e);
              console.log(`${secret.id} Lỗi: ${e.message}`);
            }
          }
        })
    )
  );
};

main();
