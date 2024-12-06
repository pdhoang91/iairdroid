import {
  getDogs,
  getDogsAddress,
  getTon,
  nonBounceableFmt,
  sendAllTon,
  sendAllTonV5,
  sendTon,
  sendTonV5,
} from "../../utils/balance-ton.js";
import { randomInt, sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllTonAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(20);
const MIN_AIRDROP_GAS = 0.1;
const MIMINAL_SEND_AMOUNT = 0.001;
const MAX_AIRDROP_GAS = 0.1;
const MIN_TON_TO_SEND = 0.01;
const MIN_DOG_TO_WITHDRAW = 500;
const MAX_RETRY = 10;
const main = async () => {
  const secrets = await getAllTonAddress();
  const onchainData = await fetchTonAmount(secrets);
  console.log(`Fetched ${onchainData.length}/${secrets.length} accounts data!`)
  const sourceSecrets = onchainData
    .flat()
    .filter(({ ton, dogs }) => ton > 0 && dogs < MIN_DOG_TO_WITHDRAW)
    .map((secret) => {
      secret.minSupplierAmount = 0;
      return secret;
    })
    .sort((a, b) => a.ton - b.ton);
  let destSecrets = onchainData
    .flat()
    .filter(
      ({ ton, dogs }) => dogs > MIN_DOG_TO_WITHDRAW && ton < MAX_AIRDROP_GAS
    )
    .map((secret) => {
      secret.minSupplierAmount = MIN_AIRDROP_GAS;
      return secret;
    })
    .sort((a, b) => b.dogs - a.dogs);
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
                if (supplierTon == 0) {
                  sourceSecret.log("Running out of money, quit!");
                  return;
                }
                if (amount >= supplierTon) {
                  amount = supplierTon;
                  isSendAll = true;
                }
                if (amount < MIMINAL_SEND_AMOUNT) {
                  sourceSecret.log(`Send amount ${amount} is too small, quit!`);
                  return
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
              let dogsAddressV4 = await reqExec(() =>
                getDogsAddress(addressV4)
              );
              let dogsAddressV5 = await reqExec(() =>
                getDogsAddress(addressV5)
              );
              let tonV4 = await reqExec(() => getTon(addressV4));
              let dogsV4 = await reqExec(() =>
                getDogs(dogsAddressV4.toString())
              );
              let tonV5 = await reqExec(() => getTon(addressV5));
              
              let dogsV5 = await reqExec(() =>
                getDogs(dogsAddressV5.toString())
              );

              await sleep(0.5);
              return [
                { ...secret, ton: tonV4, dogs: dogsV4, isV5: false },
                { ...secret, ton: tonV5, dogs: dogsV5, isV5: true },
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
