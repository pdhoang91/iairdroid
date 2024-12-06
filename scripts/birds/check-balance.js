import { getLatestCheckin, getLockWormList, getOrCreateUser, getRefferalList, getWormList } from "../../utils/birds.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBirdsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(100);
const MAX_RETRY = 2;

const main = async () => {
  const secrets = await getAllBirdsAddress();
  let c = -1;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            try {
              const {incubation, balance} = await reqExec(() => getOrCreateUser(secret))
              const { total } = await reqExec(() => getRefferalList(secret))
              const latestCheckin = await reqExec(() => getLatestCheckin(secret))
              const wormList = await reqExec(() => getWormList(secret))
              const lockWormList = await reqExec(() => getLockWormList(secret))
              while (c < i) {
                if (c == i - 1) {
                  secret.log(
                    `Balance=${balance}, Worm=[${wormList?.meta?.totalCount} + ${lockWormList?.meta?.totalCount} lock], Egg=${incubation.level}, Ref=${total}${latestCheckin ? `, Checkin=[${latestCheckin.date} (${latestCheckin.index}) +${latestCheckin.reward / 1_000_000_000} BIRD]` : ""}`
                  );
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
};

main();
