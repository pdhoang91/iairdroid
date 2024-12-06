import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllYescoinAddress } from "../../utils/wallet.js";
import { getAccountBuildInfo, getAccountInfo, getRefCode, getSkinList, getStatistics, getWallet, login } from "../../utils/yescoin.js";

const { exec } = newSemaphore(50);
const MAX_RETRY = 3;
const GET_STATISTIC = true;

const main = async () => {
  const secrets = await getAllYescoinAddress();
  let c = -1;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry < MAX_RETRY) {
              try {
                const token = await login(secret);
                if (GET_STATISTIC) {
                  await getStatistics(secret, token);
                }
                const boostsInfo = await getAccountBuildInfo(secret, token);
                const { yesSummerList: skinList } = await getSkinList(secret, token);
                const havingSkins = skinList.filter(({skinStatus}) => skinStatus >= 1);
                const wallets = await getWallet(secret, token);

                let tapLevel = boostsInfo.singleCoinLevel;
                let energyLevel = boostsInfo.coinPoolTotalLevel;
                let chargeLevel = boostsInfo.coinPoolRecoveryLevel;
                let yespacLevel = boostsInfo.swipeBotLevel;
                const { totalRecords } = await getRefCode(secret, token)
                const { totalAmount, rank, inviteAmount, levelInfo } = await getAccountInfo(secret, token);
                while (c < i) {
                  if (c == i - 1) {
                    secret.log(`Amount=${totalAmount}, Level=${levelInfo.level}, Rank=${rank}, Ref=${totalRecords}, Skins=${havingSkins.length + 1}, Invite amount: ${inviteAmount} (tap=${tapLevel}|energy=${energyLevel}|charge=${chargeLevel}|yespac=${yespacLevel})${wallets.length > 0 ? " (" + wallets.map(({friendlyAddress}) => friendlyAddress).join(", ") + ")" : " (NOT LINK WALLET)"}`);
                    c++;
                  }
                  await sleep(0.05);
                }
                return;
              } catch (e) {
                retry++;
                while (true) {
                  if (c == i - 1) {
                    secret.log(`ERROR: ${e?.message}`)
                    if (e?.message == "invalid code error") {
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
          }
        })
    )
  );
};

main();
