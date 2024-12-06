
import { createUser, getExchangeClaimStatus, getReferralStatus, getUserInfo } from "../../utils/cats.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllCatsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(100);
const MAX_RETRY = 3;

const main = async () => {
  const secrets = await getAllCatsAddress();
  let c = -1, total = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry < MAX_RETRY) {
              try {
                // await reqExec(() => createUser(secret))
                const userInfo = await reqExec(() => getUserInfo(secret))
                const { totalReferents } = await reqExec(() => getReferralStatus(secret));
                const exchangeClaim = await reqExec(() => getExchangeClaimStatus(secret));
                total += parseInt(userInfo.totalRewards)
                while (c < i) {
                  if (c == i - 1) {
                    secret.log(
                      `${userInfo.username} Balance=${userInfo.totalRewards}, RefCount=${totalReferents} ${exchangeClaim ? `Exchange=${exchangeClaim.exchange} (${exchangeClaim.uuid} | ${exchangeClaim.address} | ${exchangeClaim.memo})` : ""}`
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
  console.log(`Total ${total} CATS reward!`)
};

main();
