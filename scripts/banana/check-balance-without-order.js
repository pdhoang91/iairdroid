import { Address } from "@ton/core";
import {
  getTon,
  getUsdt,
  getUsdtAddress,
  nonBounceableFmt,
} from "../../utils/balance-ton.js";
import { getFullBananaList, getUserInfo, login } from "../../utils/banana.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBananaAddress } from "../../utils/wallet.js";
import { sleep } from "../../utils/helper.js";

const { exec } = newSemaphore(50);
const { exec: onChainExec } = newSemaphore(10);
const ONLY_USDT_ACC = true;
const ONLY_WITHDRAWABLE = true;
const INCLUDE_ONCHAIN_MONEY = false;
const MAX_RETRY = 3;
const WITHDRAWABLE_AMOUNT = 0.5;
const ONLY = [];

const main = async () => {
  let secrets = await getAllBananaAddress();
  if (ONLY.length > 0) {
    secrets = secrets.filter((secret) => ONLY.includes(secret.id))
  }
  let totalUsdt = 0,
    totalSellableUsdt = 0,
    totalWithdrawableUsdt = 0;
  let totalAccount = 0,
    totalWithdrawableAccount = 0,
    totalUsdtAccount = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry <= MAX_RETRY) {
              retry++
              try {
                const token = await login(secret);
                const userInfo = await getUserInfo(secret, token);
                const bananas = await getFullBananaList(secret, token);
                const peel = userInfo.peel || 0;
                const usdt = userInfo.usdt || 0;
                const walletAddress = userInfo.ton_wallet;
                const bananaCount = bananas
                  .filter((val) => val.count > 0)
                  .reduce((total, val) => {
                    return total + val.count;
                  }, 0);
                const sellAbleUsdtBanana = bananas.filter(
                  (val) => val.count > 0 && val.sell_exchange_usdt
                );
                const sellAbleUsdt = sellAbleUsdtBanana.reduce(
                  (totalUsdt, val) => {
                    return totalUsdt + val.sell_exchange_usdt * val.count;
                  },
                  0
                );
                let onChainAddress,
                  nonBounceAddress,
                  jettonAddress,
                  onChainUsdt = 0,
                  onChainTon = 0,
                  showOnchain = false;
                if (INCLUDE_ONCHAIN_MONEY) {
                  if (walletAddress) {
                    onChainAddress = (await secret.getWallet())?.address;
                    if (!onChainAddress) {
                      onChainAddress = Address.parse(walletAddress);
                      jettonAddress = await onChainExec(() =>
                        getUsdtAddress(onChainAddress)
                      );
                    } else {
                      jettonAddress = await onChainExec(() =>
                        secret.getUSDTAddress()
                      );
                    }
                    nonBounceAddress = nonBounceableFmt(onChainAddress);
                  }
                  if (onChainAddress) {
                    onChainTon = await onChainExec(() =>
                      getTon(onChainAddress)
                    );
                    onChainUsdt = await onChainExec(() =>
                      getUsdt(jettonAddress.toString())
                    );
                  }
                  showOnchain = onChainUsdt + onChainTon > 0;
                }
                const withdrawable = usdt + sellAbleUsdt >= WITHDRAWABLE_AMOUNT;

                if (
                  !ONLY_USDT_ACC ||
                  (ONLY_USDT_ACC && (usdt + sellAbleUsdt > 0 || showOnchain))
                ) {
                  if (
                    !ONLY_WITHDRAWABLE ||
                    (ONLY_WITHDRAWABLE && withdrawable) ||
                    (INCLUDE_ONCHAIN_MONEY && showOnchain)
                  ) {
                    console.log(
                      `${secret.id} Balance=${peel}, USDT=${usdt}, ${
                        walletAddress ? `Address=${walletAddress}, ` : ""
                      }BananaCount=${bananaCount}, SellAbleUSDT=${sellAbleUsdt} (total ${
                        sellAbleUsdtBanana.length
                      }) ${withdrawable ? "(WITHDRAWABLE)" : ""} ${
                        showOnchain
                          ? `| ONCHAIN: TON=${onChainTon}, USDT=${onChainUsdt} ${
                              walletAddress != nonBounceAddress
                                ? `${nonBounceAddress}`
                                : ""
                            }`
                          : ""
                      }`
                    );
                  }
                }
                totalUsdt += usdt;
                totalSellableUsdt += sellAbleUsdt;
                totalAccount++;
                if (usdt + sellAbleUsdt > 0) totalUsdtAccount++;
                if (withdrawable) {
                  totalWithdrawableAccount++;
                  totalWithdrawableUsdt += usdt + sellAbleUsdt;
                }
                return;
              } catch (e) {
                secret.error(e);
                await sleep(1);
              }
            }
          }
        })
    )
  );
  console.log(`>> total usdt=${totalUsdt}`);
  console.log(
    `>> total sellable usdt=${totalSellableUsdt} (${totalUsdtAccount}/${totalAccount} accounts)`
  );
  console.log(
    `>> total withdrawable usdt=${totalWithdrawableUsdt} (${totalWithdrawableAccount}/${totalAccount} accounts)`
  );
};

main();
