import {
  checkDogsDrop,
  getBalance,
  getDogsBalance,
  getRefferalCode,
  getUserInfo,
  getWalletBalance,
  getWalletHistory,
  login,
} from "../../utils/blum.js";
import { sleep } from "../../utils/helper.js";

import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBlumAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(100);
const MAX_RETRY = 3;
const ONLY_DOG_DROPS = true;
const FETCH_TX = false;

const main = async () => {
  const secrets = await getAllBlumAddress();
  let c = -1
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry < MAX_RETRY) {
              try {
                await reqExec(() => login(secret, "", false, false));
                const dogsDropEligible = await reqExec(() => checkDogsDrop(secret));
                const dogsBalance = await reqExec(() => getDogsBalance(secret))
                if (ONLY_DOG_DROPS  && !dogsDropEligible && dogsBalance == 0) {
                  while (c < i) {
                    if (c == i - 1) {
                      c++;
                      return
                    }
                    await sleep(0.05);
                  }
                }
                const { username } = await reqExec(() => getUserInfo(secret))
                const balanceInfo = await reqExec(() => getBalance(secret));
                const referralInfo = await reqExec(() =>
                  getRefferalCode(secret)
                );
                const walletInfo = await reqExec(() => getWalletBalance(secret));
                let txs = []
                if (walletInfo.address && FETCH_TX) {
                  txs = await reqExec(() => getWalletHistory(secret));
                }

                while (c < i) {
                  if (c == i - 1) {
                    secret.log(
                      `${username} BP=${balanceInfo.availableBalance}, DOGS=${dogsBalance}, Play passes=${balanceInfo.playPasses}, Referral=${referralInfo?.usedInvitation || 0}${walletInfo ? ` (${walletInfo.address} - ${txs.length} txs)` : ""}${dogsDropEligible ? " [DOGS_DROP]" : ""}`
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
                    // console.error(e);
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
};

main();
