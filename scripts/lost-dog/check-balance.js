import { sleep } from "../../utils/helper.js";
import { getLeagueInfo, getLostDogsWayUserInfo, getRefInfo, getWalletStatus } from "../../utils/lost-dog.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllLostDogAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const {exec: reqExec} = newSemaphore(100);
const MAX_RETRY = 3;

const main = async () => {
  const secrets = await getAllLostDogAddress();
  let c = -1, totalNot = 0, totalWoof = 0, totalBones = 0, totalWin = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry < MAX_RETRY) {
              try {
                const userInfo = await reqExec(() => getLostDogsWayUserInfo(secret));
                const leagueInfo = await reqExec(() => getLeagueInfo(secret));
                const walletStatus = await reqExec(() => getWalletStatus(secret));
                const { invitedPeopleCount } = await reqExec(() => getRefInfo(secret))
                const woofBalance = parseFloat(userInfo?.woofBalance) / 1e9;
                const notBalance = parseInt(walletStatus.notBalance) / 1e9;
                totalBones += parseInt(userInfo?.gameDogsBalance)
                totalNot += notBalance
                totalWoof += woofBalance
                totalWin += leagueInfo?.user?.correctVotesCount || 0
                while (c < i) {
                  if (c == i - 1) {
                    secret.log(
                        `${leagueInfo?.user?.correctVotesCount} wins (${leagueInfo.name}, rank=${leagueInfo?.user?.place}, invite=${invitedPeopleCount}) WOOF=${woofBalance}, BONES=${userInfo?.gameDogsBalance}, NOT=${notBalance} (${walletStatus.connectedWalletAddress ? walletStatus.connectedWalletAddress : "NOT CONNECTED"})`
                      );
                    c++;
                  }
                  await sleep(0.05);
                }
                return;
              } catch (e) {
                retry++;
                while (true) {
                  if (c == i - 1) {
                    console.log(`${secret.id} Lỗi: ${e.message}`);
                    if (retry == MAX_RETRY) {
                      c++;
                    }
                    break;
                  }
                  await sleep(0.05);
                }
              }
            }
          }
        })
    )
  );
  console.log(`Average ${(totalWin / secrets.length).toFixed(1)} wins`)
  console.log(`Total ${totalNot} NOT, ${totalWoof} WOOF, ${totalBones} BONES!`)
};

main();
