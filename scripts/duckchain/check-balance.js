import { getAllDuckchainAddress } from "../../utils/wallet.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getDuckLevel, getInviteInfo, getMyNft, getUserInfo } from "../../utils/duckchain.js";
import { sleep } from "../../utils/helper.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(100);
const MAX_RETRY = 2;

const main = async () => {
  const secrets = await getAllDuckchainAddress();
  let c = -1,
    totalDuck = 0, totalEgg = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            try {
              const userInfo = await reqExec(() => getUserInfo(secret));
              const {boxesEarned} = await reqExec(() => getInviteInfo(secret));
              const nfts = await reqExec(() => getMyNft(secret))
              const decibels = parseInt(userInfo.decibels);
              const quackTimes = userInfo.quackTimes;
              const { level, levelName } = getDuckLevel(decibels);
              totalDuck += decibels;
              totalEgg += parseInt(userInfo?.eggs || 0)
              while (c < i) {
                if (c == i - 1) {
                  secret.log(
                    `Balance=${decibels}, Egg=${userInfo?.eggs}, Ref=${boxesEarned}, Box=${userInfo.boxAmount}, NFT=${nfts.length}, QuackTimes=${quackTimes}, Level=${level} (${levelName})${userInfo?.particleWallet ? ` Wallet=${userInfo?.particleWallet}`:""}`
                  );
                  c++;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
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
        })
    )
  );
  console.log(`Total ${totalDuck} DUCK, ${totalEgg} EGG!`);
};

main();
