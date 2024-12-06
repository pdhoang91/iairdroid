import { getDogs, getDogsAddress, getHmstr, getHmstrAddress, getTon, nonBounceableFmt } from "../../utils/balance-ton.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllTonAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(20);
const RANGE = [0, 1000];
const MAX_RETRY = 3;
const SHOW_DOGS = false;
const SHOW_HMSTR = true;

const main = async () => {
  const [start, end] = RANGE;
  const secrets = await getAllTonAddress();
  let c = -1;
  await Promise.all(
    secrets
      .filter((secret, i) => i >= start && i <= end)
      .map((secret, i) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              const address = (await secret.getWallet())?.address;
              const addressV5 = (await secret.getWalletV5())?.address;
              const nonBounceAddress = nonBounceableFmt(address);
              const nonBounceAddressV5 = nonBounceableFmt(addressV5);
              const ton = await reqExec(() => getTon(nonBounceAddress));
              const tonV5 = await reqExec(() => getTon(nonBounceAddressV5));
              let dogsAddress, dogsAddressV5, hmstrAddress, hmstrAddressV5, dogs = 0, dogsV5 = 0, hmstr = 0, hmstrV5 = 0
              if (SHOW_DOGS) {
                dogsAddress = await reqExec(() => getDogsAddress(address));
                dogsAddressV5 = await reqExec(() => getDogsAddress(addressV5));
                dogs = await reqExec(() =>
                  getDogs(dogsAddress.toString())
                );
                dogsV5 = await reqExec(() =>
                  getDogs(dogsAddressV5.toString())
                );
              }
              if (SHOW_HMSTR) {
                hmstrAddress = await reqExec(() => getHmstrAddress(address));
                hmstrAddressV5 = await reqExec(() => getHmstrAddress(addressV5));
                hmstr = await reqExec(() =>
                  getHmstr(hmstrAddress.toString(), address)
                );
                hmstrV5 = await reqExec(() =>
                  getHmstr(hmstrAddressV5.toString(), addressV5)
                );
              }
              while (c < i) {
                if (c == i - 1) {
                  if (ton + dogs + hmstr > 0) {
                    secret.log(`${ton} TON${SHOW_DOGS ? `, ${dogs} DOGS` : ""}${SHOW_HMSTR ? `, ${hmstr} HMSTR` : ""} (${nonBounceAddress}) (V4)`);
                  }
                  if (tonV5 + dogsV5 + hmstrV5 > 0) {
                    secret.log(`${tonV5} TON${SHOW_DOGS ? `, ${dogsV5} DOGS` : ""}${SHOW_HMSTR ? `, ${hmstrV5} HMSTR` : ""} (${nonBounceAddressV5}) (V5)`);
                  }
                  c++;
                  return;
                }
                await sleep(0.05);
              }
            } catch (e) {
              while (true) {
                if (c == i - 1) {
                  // console.error(e)
                  secret.error(e);
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
