import { sleep } from "../../utils/helper.js";
import { getUserInfo, login } from "../../utils/paws.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPawsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const MAX_RETRY = 3;

const main = async () => {
  const secrets = await getAllPawsAddress();
  let c = -1, totalPaws = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry < MAX_RETRY) {
              try {
                await login(secret);
                const userInfo = await getUserInfo(secret)
                totalPaws += userInfo?.gameData?.balance || 0;
                const wallet = userInfo?.userData?.wallet;
                while (c < i) {
                  if (c == i - 1) {
                    secret.log(`Balance=${userInfo?.gameData?.balance} Ref=${userInfo?.referralData?.referralsCount}${wallet ? ` Wallet=${wallet}` : ""}`);
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
  console.log(`Having ${totalPaws} PAWS!`)
};

main();
