import { Address } from "@ton/core";
import { nonBounceableFmt } from "../../utils/balance-ton.js";
import { getReward, getRewardFromTokenTable, getWallet, getWithdrawMethod, getWithdrawalInfo, isWithdrawn } from "../../utils/dogs.js";
import { getAllDogsAddress } from "../../utils/wallet.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { sleep } from "../../utils/helper.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(100);
const MAX_RETRY = 2;
const ONLY_NOT_WITHDRAWN = false;
const ONLY_WITHDRAWN = true;

const main = async () => {
  const secrets = await getAllDogsAddress();
  let c = -1,
    total = 0, totalNotWithdrawnAccount = 0, totalNotWithdrawnAmount = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            try {
              let show = true;
              const reward = await reqExec(() => getReward(secret));
              const wallet = getWallet(secret);
              const withdrawMethod = getWithdrawMethod(secret)
              const withdrawalStatus = reqExec(() => getWithdrawalInfo(secret));
              const withdrawn = isWithdrawn(secret)
              let withdrawalStr = withdrawn ? "(WITHDRAWN) " : "(NOT WITHDRAWN) ";
              withdrawalStr += withdrawMethod ? `(method=${withdrawMethod})` : "";
              if (withdrawalStatus) {
                withdrawalStr += withdrawalStatus.exchange
                  ? `exchange=${withdrawalStatus.exchange}, `
                  : "";
                withdrawalStr += withdrawalStatus.deposit_address
                  ? `address=${Address.parse(
                      withdrawalStatus.deposit_address
                    ).toString()}, `
                  : "";
                withdrawalStr += withdrawalStatus.memo
                  ? `memo=${withdrawalStatus.memo}, `
                  : "";
                withdrawalStr += withdrawalStatus.id
                  ? `(${withdrawalStatus.id})`
                  : "";
              }
              if (ONLY_NOT_WITHDRAWN && withdrawMethod != "burn") {
                show = false;
              }
              if (ONLY_WITHDRAWN && withdrawMethod == "burn") {
                show = false;
              }
              if (withdrawMethod == "burn") {
                totalNotWithdrawnAccount++
                totalNotWithdrawnAmount += parseFloat(reward)
              }
              total += parseFloat(reward);
              while (c < i) {
                if (c == i - 1) {
                  if (show) {
                    secret.log(
                      `reward=${reward}, wallet=${
                        wallet ? nonBounceableFmt(wallet) : null
                      }, ${withdrawalStr}`
                    );
                  }
                  c++;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
              return;
            } catch (e) {
              retry++;
              while (true) {
                if (c == i - 1) {
                  // console.error(e);
                  console.log();
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
  console.log(`Total ${total} DOGS!`);
  console.log(`Total ${totalNotWithdrawnAccount} accounts, ${totalNotWithdrawnAmount} DOGS not withdrawn!`);
};

main();
