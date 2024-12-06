import {
  checkTonWalletProof,
  doWithdraw,
  getTonWalletPayload,
  getUserInfo,
  login,
} from "../../utils/banana.js";
import { JSONStringtify, sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBananaAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(10);
const WITHDRAWABLE_AMOUNT = 0.5;
const ONLY = [];

const main = async () => {
  let secrets = await getAllBananaAddress();
  if (ONLY.length > 0) {
    secrets = secrets.filter((secret) => ONLY.includes(secret.id));
  }
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                const token = await login(secret);
                let userInfo = await getUserInfo(secret, token);
                let walletAddress = userInfo.ton_wallet;
                const usdt = userInfo.usdt || 0;
                if (usdt < WITHDRAWABLE_AMOUNT) {
                  secret.log(`Don't have enough money to withdraw, current have ${usdt} USDT`);
                  return
                }
                if (!walletAddress) {
                  secret.log("Get ton wallet payload");
                  const message = await getTonWalletPayload(secret, token);
                  await checkTonWalletProof(secret, token, message);
                  secret.log("Link wallet success")
                  userInfo = await getUserInfo(secret, token);
                  walletAddress = userInfo.ton_wallet;
                }
                secret.log(`Withdraw ${usdt} USDT to wallet ${walletAddress}`);
                const data = await doWithdraw(secret, token);
                secret.log(`Withdraw success, data: ${JSONStringtify(data)}`)
                return;
              } catch (e) {
                // secret.error(e);
                secret.log(`ERROR: ${e?.message}`);
                await sleep(1);
              }
            }
          }
        })
    )
  );
};

main();
