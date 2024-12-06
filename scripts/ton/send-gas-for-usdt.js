import {
  getTon,
  getUsdt,
  getUsdtAddress,
  nonBounceableFmt,
  sendAllTon,
  sendAllTonV5,
  sendTon,
  sendTonV5,
} from "../../utils/balance-ton.js";
import { randomInt, sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBananaAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(20);
const MIN_AIRDROP_GAS = 0.07;
const MIMINAL_SEND_AMOUNT = 0.001;
const MAX_AIRDROP_GAS = 0.08;
const MIN_TON_TO_SEND = 0.01;
const MIN_USDT_TO_WITHDRAW = 0.5;
const MAX_RETRY = 10;
const ONLY = [
];

const main = async () => {
  let secrets = await getAllBananaAddress();
  if (ONLY.length > 0) {
    secrets = secrets.filter((secret) => ONLY.includes(secret.id));
  }
  const onchainData = await fetchTonAmount(secrets);
  console.log(`Fetched ${onchainData.length}/${secrets.length} accounts data!`);
  const sourceSecrets = onchainData
    .flat()
    .filter(({ ton, usdt }) => ton > 0 && usdt < MIN_USDT_TO_WITHDRAW)
    .map((secret) => {
      secret.minSupplierAmount = 0;
      return secret;
    })
    .sort((a, b) => a.ton - b.ton);
  let destSecrets = onchainData
    .flat()
    .filter(
      ({ ton, usdt }) => usdt > MIN_USDT_TO_WITHDRAW && ton < MAX_AIRDROP_GAS
    )
    .map((secret) => {
      secret.minSupplierAmount = MIN_AIRDROP_GAS;
      return secret;
    })
    .sort((a, b) => b.usdt - a.usdt);
  const totalSourceTon = sourceSecrets.reduce(
    (total, { ton }) => total + ton,
    0
  );
  const requiredTon = MAX_AIRDROP_GAS;

  console.log(
    `Found ${sourceSecrets.length} source addresses (total ${totalSourceTon} TON), ${destSecrets.length} destination addresses (require at least ${requiredTon} per addresses)`
  );
  sourceSecrets.forEach((secret) => secret.log(`>> TON=${secret.ton}`));
  let x = 0,
    waitTasks = [];
  for (let i = 0; i < destSecrets.length; i++) {
    const destSecret = destSecrets[i],
      destAddress = destSecret.isV5
        ? (await destSecret.getWalletV5())?.address
        : (await destSecret.getWallet())?.address,
      nonBounceDestAddress = nonBounceableFmt(destAddress);
    let receiverTon = destSecret.ton,
      missingTon = requiredTon - receiverTon,
      currentReceiverTon = receiverTon;
    while (x < sourceSecrets.length && currentReceiverTon < requiredTon) {
      if (missingTon <= MIN_TON_TO_SEND) {
        break;
      }
      const sourceSecret = sourceSecrets[x],
        supplierTon = sourceSecret.ton;
      if (supplierTon <= MIN_TON_TO_SEND) {
        x++;
        continue;
      }
      let amount = missingTon;
      if (supplierTon - amount < sourceSecret.minSupplierAmount) {
        amount = supplierTon - sourceSecret.minSupplierAmount;
      }
      if (supplierTon <= sourceSecret.minSupplierAmount || amount <= 0) {
        x++;
        continue;
      }

      //   sourceSecret.log(
      //     `Send ${amount} TON to address ${nonBounceDestAddress} (${destSecret.id})`
      //   );
      const task = () =>
        destSecret.exec(() =>
          sourceSecret.exec(async () => {
            while (true) {
              try {
                let supplierAddress = sourceSecret.isV5
                  ? (await sourceSecret.getWalletV5())?.address
                  : (await sourceSecret.getWallet())?.address;
                let isSendAll = false;
                const supplierTon = await reqExec(() =>
                  getTon(supplierAddress)
                );
                if (supplierTon <= MIN_TON_TO_SEND) {
                  sourceSecret.log("Running out of money, quit!");
                  return;
                }
                if (amount >= supplierTon) {
                  amount = supplierTon;
                  isSendAll = true;
                }
                if (amount < MIMINAL_SEND_AMOUNT) {
                  sourceSecret.log(`Send amount ${amount} is too small, quit!`);
                  return;
                }
                sourceSecret.log(
                  `Send ${
                    isSendAll ? "all " : ""
                  }${amount} TON to address ${nonBounceDestAddress} (${
                    destSecret.id
                  })`
                );
                if (isSendAll) {
                  await reqExec(() =>
                    sourceSecret.isV5
                      ? sendAllTonV5(sourceSecret, nonBounceDestAddress)
                      : sendAllTon(sourceSecret, nonBounceDestAddress)
                  );
                } else {
                  await reqExec(() =>
                    sourceSecret.isV5
                      ? sendTonV5(sourceSecret, nonBounceDestAddress, amount)
                      : sendTon(sourceSecret, nonBounceDestAddress, amount)
                  );
                }
                sourceSecret.log(
                  ` => SUCCESS: Send ${amount} TON to address ${nonBounceDestAddress} (${destSecret.id})`
                );
                return;
              } catch (e) {
                sourceSecret.log(
                  `ERROR: ${e?.response?.data?.error || e?.message}`
                );
                await sleep(randomInt(1, 2));
              }
            }
          })
        );
      waitTasks.push(task);
      missingTon -= amount;
      sourceSecret.ton -= amount;
      currentReceiverTon += amount;
    }
  }
  console.log(`Executing ${waitTasks.length} tasks`);
  await Promise.all(waitTasks.map((task) => task()));
  console.log(`Done ${waitTasks.length} tasks`);
};

const fetchTonAmount = async (secrets) => {
  return (
    await Promise.all(
      secrets.map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            try {
              let addressV4 = (await secret.getWallet())?.address;
              let addressV5 = (await secret.getWalletV5())?.address;
              if (!addressV4) return null;
              let usdtAddressV4 = await reqExec(() =>
                getUsdtAddress(addressV4)
              );
              let usdtAddressV5 = await reqExec(() =>
                getUsdtAddress(addressV5)
              );
              let tonV4 = await reqExec(() => getTon(addressV4));
              let usdtV4 = await reqExec(() =>
                getUsdt(usdtAddressV4.toString(), addressV4)
              );
              let tonV5 = await reqExec(() => getTon(addressV5));

              let usdtV5 = await reqExec(() =>
                getUsdt(usdtAddressV5.toString(), addressV5)
              );

              await sleep(0.5);
              return [
                { ...secret, ton: tonV4, usdt: usdtV4, isV5: false },
                { ...secret, ton: tonV5, usdt: usdtV5, isV5: true },
              ];
            } catch (e) {
              retry++;
              secret.error(e);
            } finally {
              await sleep(0.5);
            }
          }
          return null;
        })
      )
    )
  ).filter((val) => val);
};

main();
