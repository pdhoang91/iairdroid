import { ton } from "../../config/network.js";
import { getDogs, getDogsAddress, getTon, nonBounceableFmt } from "../../utils/balance-ton.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllDogsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(5);
const { exec: reqExec } = newSemaphore(5);
const RANGE = [0, 44];
const MAX_RETRY = 3;

const main = async () => {
  await ton()
  const [start, end] = RANGE;
  const secrets = await getAllDogsAddress();
  let c = -1, totalTon = 0, totalAccount = 0;
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
              if (!address) {
                while (c < i) {
                  if (c == i - 1) {
                    secret.log("Missing mapping address")
                    c++;
                    return;
                  }
                  await sleep(0.05);
                }
                return
              }
              const addressV5 = (await secret.getWalletV5())?.address;
              const nonBounceAddress = nonBounceableFmt(address);
              const nonBounceAddressV5 = nonBounceableFmt(addressV5);
              const ton = await reqExec(() => getTon(nonBounceAddress));
              const tonV5 = await reqExec(() => getTon(nonBounceAddressV5));
              const dogsAddress = await reqExec(() => secret.getDOGSAddress());
              const dogsAddressV5 = await reqExec(() => getDogsAddress(addressV5));
              const dogs = await reqExec(() =>
                getDogs(dogsAddress.toString())
              );
              const dogsV5 = await reqExec(() =>
                getDogs(dogsAddressV5.toString())
              );
              totalTon += ton + tonV5;
              totalAccount++;
              while (c < i) {
                if (c == i - 1) {
                  // secret.log(secret.index)
                  if (ton + dogs > 0 || !secret.isV5) {
                    secret.log(`${ton} TON, ${dogs} DOGS (${nonBounceAddress}) (V4)`);
                  }
                  if (tonV5 + dogsV5 > 0 || secret.isV5) {
                    secret.log(`${tonV5} TON, ${dogsV5} DOGS (${nonBounceAddressV5}) (V5)`);
                  }
                  c++;
                  return;
                }
                await sleep(0.05);
              }
            } catch (e) {
              while (true) {
                if (c == i - 1) {
                  console.error(e)
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
  console.log(`Total ${totalTon} TON, ${totalAccount} accounts!`)
};

main();
