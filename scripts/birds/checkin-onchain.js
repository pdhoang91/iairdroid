import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBirdsAddress } from "../../utils/wallet.js";
import { confirmCheckin, getLatestCheckin, getWallet, presignCheckin } from "../../utils/birds.js";
import { checkinBird } from "../../utils/balance-birds.js";
import { sleep } from "../../utils/helper.js";
import { getCurrentSui } from "../../utils/balance-ocean.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(2);
const MIN_SUI = 0.007;
const main = async () => {
  let secrets = await getAllBirdsAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                if (!secret.address) {
                  secret.log("Missing seedphrase")
                  return
                }
                let { address: bindedAddress } = await getWallet(secret);
                if (!bindedAddress) return
                if (secret.address != bindedAddress) {
                  secret.log("Address not match")
                  return
                }
                const latestCheckin = await getLatestCheckin(secret);
                const today = new Date();
                const todayInStr = `${today.getUTCFullYear()}-${today.getUTCMonth() + 1}-${today.getUTCDate()}`;
                if (latestCheckin?.date == todayInStr) {
                  secret.log(`Already checkin for date ${latestCheckin.index} ${todayInStr}, +${latestCheckin.reward / 1_000_000_000} BIRD`);
                  return
                }
                const sui = await reqExec(() => getCurrentSui(secret.address));
                if (sui < MIN_SUI) {
                  secret.log(`Not having enough SUI, having ${sui} SUI`);
                  return
                }
                secret.log(`Getting signature for date ${todayInStr}`)
                const { message, signature, token } = await presignCheckin(secret, bindedAddress);
                secret.log(`Checkin for date ${todayInStr}`);
                const txHash = await reqExec(() => checkinBird(secret, message, signature, todayInStr));
                secret.log(`Checkin for date ${todayInStr} SUCCESS!`);
                secret.log(`Confirm checkin with tx hash ${txHash}`);
                await confirmCheckin(secret, token, txHash);
                secret.log(`Confirm checkin SUCCESS!`);
                await sleep(5);
              } catch (e) {
                console.error(e);
                secret.error(`ERROR: ${e?.message || e}`);
              }
            }
          }
        })
    )
  );
};

main();
