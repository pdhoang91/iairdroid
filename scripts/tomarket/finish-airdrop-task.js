import { newSemaphore } from "../../utils/semaphore.js";
import {
  checkAirdrop,
  checkAirdropOG,
  checkAirdropTask,
  claimAirdropTask,
  claimToken,
  claimTokenOG,
  getAirdropTasks,
  getSeasonToken,
  login,
  showAirdropToken,
  startAirdropTask,
} from "../../utils/tomarket.js";
import { getAllTomarketAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const LOG_UNQUALIFY = false;

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
                await showAirdropToken(secret, access_token);
                const { tomaAirDrop, claimed } = await checkAirdrop(
                  secret,
                  access_token
                );
                if (tomaAirDrop?.amount && parseInt(tomaAirDrop?.amount) > 0 && !claimed) {
                  secret.log(`Claim airdrop ${tomaAirDrop?.amount} TOMA`);
                  const data = await claimToken(secret, access_token);
                  secret.log(
                    `Claim airdrop ${data?.tomarketReward} TOMA SUCCESS!`
                  );
                }

                const airdropOG = await checkAirdropOG(
                  secret,
                  access_token
                );
                if (airdropOG?.tomaAirDrop?.amount && parseInt(airdropOG?.tomaAirDrop?.amount) > 0 && !airdropOG?.claimed) {
                  secret.log(`Claim airdrop OG ${airdropOG?.tomaAirDrop?.amount} TOMA`);
                  const data = await claimTokenOG(secret, access_token);
                  secret.log(
                    `Claim airdrop OG ${data?.tomarketReward} TOMA SUCCESS!`
                  );
                }
                while (true) {
                  const seasonToken = await getSeasonToken(
                    secret,
                    access_token
                  );
                  if (
                    seasonToken?.tomaAirDrop?.amount &&
                    parseInt(seasonToken?.tomaAirDrop?.amount) > 0 &&
                    !seasonToken?.claimed
                  ) {
                    secret.log(
                      `Claim season token airdrop ${seasonToken?.round?.name} ${seasonToken?.tomaAirDrop?.amount} TOMA`
                    );
                    const data = await claimToken(
                      secret,
                      access_token,
                      seasonToken?.round?.name
                    );
                    secret.log(
                      `Claim season token airdrop ${seasonToken?.round?.name} ${data?.tomarketReward} TOMA SUCCESS!`
                    );
                  } else {
                    break
                  }
                }
                let tasks = await getAirdropTasks(secret, access_token);
                secret.log(`${tasks.length} tasks found`);
                for (const task of tasks) {
                  let {
                    taskId,
                    name,
                    title,
                    amount: taskBonusAmount,
                    status: taskStatus,
                    platform,
                    action,
                    type,
                    rankData,
                    checkCounter,
                    handleFunc,
                    visitLink,
                    currentCounter,
                  } = task;
                  if (taskStatus == 0) {
                    secret.log(`Start task ${title}`);
                    const { status, message } = await startAirdropTask(
                      secret,
                      access_token,
                      taskId
                    );
                    if (status != 0) throw new Error(message);
                    taskStatus = 1;
                  }
                  if (taskStatus == 1) {
                    secret.log(`Check task ${title}`);
                    const response = await checkAirdropTask(
                      secret,
                      access_token,
                      taskId
                    );
                    checkCounter = response.checkCounter || checkCounter;
                    currentCounter = response.currentCounter || currentCounter;
                    taskStatus = response.status;
                  }
                  if (taskStatus == 2) {
                    secret.log(`Claim task ${title}`);
                    const { message, status } = await claimAirdropTask(
                      secret,
                      access_token,
                      taskId
                    );
                    if (status != 0) throw new Error(message);
                    secret.log(
                      `Claim task ${title} SUCCESS! +${taskBonusAmount} TOMATO`
                    );
                  } else if (LOG_UNQUALIFY) {
                    secret.log(
                      `Task ${title} not qualify (${
                        currentCounter || 0
                      }/${checkCounter})`
                    );
                  }
                }
                return;
              } catch (e) {
                // console.error(e);
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
