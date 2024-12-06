import { JSONStringtify, sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { checkAirdrop, getBalance, getClassmateTask, getInvite, getRankData, getTokenBalance, getWallet, login } from "../../utils/tomarket.js";
import { getAllTomarketAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(100);
const MIN_BALANCE_TO_SHOW = 0;
const MAX_RETRY = 2;

const main = async () => {
  const secrets = await getAllTomarketAddress();
  let c = -1, totalRank = 0, totalTomaAirdrop = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            try {
              const access_token = await reqExec(() => login(secret))
              const { available_balance } = await reqExec(() => getBalance(secret, access_token))
              // const { rankData } = await reqExec(() => getClassmateTask(secret, access_token))
              const rankData = await reqExec(() => getRankData(secret, access_token))
              const tomaBalance = await reqExec(() => getTokenBalance(secret, access_token));
              let tomaAmount;
              if (tomaBalance) {
                // secret.log(JSONStringtify(airdrop))
                tomaAmount = parseFloat(tomaBalance)
                totalTomaAirdrop += tomaAmount
              }
              let show = true;
              if (rankData && available_balance < MIN_BALANCE_TO_SHOW) {
                show = false
              }
              if(rankData) {
                totalRank += rankData?.currentRank?.rank || 0;
              }
              const wallet = await reqExec(() => getWallet(secret, access_token))
              const { total } = await reqExec(() => getInvite(secret, access_token))
              while (c < i) {
                if (c == i - 1) {
                  if (show) {
                    console.log(
                      `${secret.id} balance=${available_balance}, airdrop=${tomaAmount} TOMA, wallet=${wallet}, invite=${total}, ${rankData ? `Rank=${rankData.futureRankName} (level=${rankData.currentRank?.level}, rank=${rankData.currentRank?.rank} (${rankData.currentRank?.stars}/${rankData.currentRank?.range}), unused stars=${rankData.unusedStars})` : "(NOT CLAIM STARS)"}`
                    );
                  }
                  c++;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
              return
            } catch (e) {
              retry++;
              while (true) {
                if (c == i - 1) {
                  console.error(e)
                  if (e?.message == "Invalid Token.") {
                    c++;
                    return
                  }
                  if (retry == MAX_RETRY) {
                    c++;
                  }
                  break;
                }
                await sleep(0.05);
              }
            }
          }

        })
    )
  );
  console.log(`Average rank: ${(totalRank/secrets.length).toFixed(1)}`)
  console.log(`Total airdrop: ${totalTomaAirdrop} TOMA`)
};

main();
