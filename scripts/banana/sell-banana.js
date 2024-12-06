import {
  getFullBananaList,
  getUserInfo,
  login,
  sellBanana,
} from "../../utils/banana.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBananaAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(10);
const MIN_WITHDRAWABLE_AMOUNT = 1;
const EXCLUDE_BANANAS = [83];
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
                const userInfo = await getUserInfo(secret, token);
                const bananas = await getFullBananaList(secret, token);
                const usdt = userInfo.usdt || 0;
                const sellAbleUsdtBanana = bananas.filter(
                  (val) => val.count > 0 && val.sell_exchange_usdt
                );
                const sellAbleUsdt = sellAbleUsdtBanana.reduce(
                  (totalUsdt, val) => {
                    return totalUsdt + val.sell_exchange_usdt * val.count;
                  },
                  0
                );
                const withdrawableAmount = usdt + sellAbleUsdt;
                if (withdrawableAmount >= MIN_WITHDRAWABLE_AMOUNT) {
                  for (const banana of bananas) {
                    const { banana_id, sell_exchange_usdt, count, name } =
                      banana;
                    if (
                      count == 0 ||
                      sell_exchange_usdt == 0 ||
                      EXCLUDE_BANANAS.includes(banana_id)
                    )
                      continue;
                    while (true) {
                      try {
                        await sellBanana(secret, token, banana_id, count);
                        console.log(
                          `${secret.id} Sold ${count} ${name} banana for ${(
                            sell_exchange_usdt * count
                          ).toFixed(2)} USDT`
                        );
                        break
                      } catch (e) {
                        secret.error(e);
                      }
                    }
                  }
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
};

main();
