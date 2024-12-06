import {
  getTon,
  nonBounceableFmt,
  sendAllTon,
  sendAllTonV5,
  sendTon,
  sendTonV5,
} from "../../utils/balance-ton.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllDogsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(5);
const { exec: reqExec } = newSemaphore(5);
const MIN_AIRDROP_GAS = 0.5;
const MIN_TON_TO_SEND = 0.1;
const SOURCE_RANGE = [2, 3],
  DEST_RANGE = [4, 44];
const main = async () => {
  const [srcStart, srcEnd] = SOURCE_RANGE;
  const [destStart, destEnd] = DEST_RANGE;
  const secrets = await getAllDogsAddress();
  const sourceSecrets = (
    await fetchTonAmount(
      secrets.filter((val, i) => i >= srcStart && i <= srcEnd)
    )
  )
    .filter(val => val)
    .filter(({ ton }) => ton > 0)
    .map((secret) => {
      secret.minSupplierAmount = 0;
      return secret;
    });
  let destSecrets = (
    await fetchTonAmount(
      secrets.filter((val, i) => i >= destStart && i <= destEnd)
    )
  ).filter(val => val).map((secret) => {
    secret.minSupplierAmount = MIN_AIRDROP_GAS;
    return secret;
  });
  const totalSourceTon = sourceSecrets.reduce(
    (total, { ton }) => total + ton,
    0
  );
  const requiredTon =
    totalSourceTon / destSecrets.length > MIN_AIRDROP_GAS
      ? (totalSourceTon / destSecrets.length).toFixed(2)
      : MIN_AIRDROP_GAS;

  console.log(
    `Found ${sourceSecrets.length} source addresses (total ${totalSourceTon} TON), ${destSecrets.length} destination addresses (require at least ${requiredTon} per addresses)`
  );
  let x = 0,
    waitTasks = [];
  destSecrets = destSecrets.filter(({ ton }) => ton < MIN_AIRDROP_GAS);
  for (let i = 0; i < destSecrets.length; i++) {
    const destSecret = destSecrets[i],
      destAddress = destSecret.isV5 ? (await destSecret.getWalletV5())?.address : (await destSecret.getWallet())?.address,
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

      // sourceSecret.log(
      //   `Send ${amount} TON to address ${nonBounceDestAddress} (${destSecret.id})`
      // );
      let task = async () =>
        await sourceSecret.exec(async () => {
          while (true) {
            try {
              const supplierAddress = sourceSecret.isV5 ? (await sourceSecret.getWalletV5())?.address : (await sourceSecret.getWallet())?.address
              let isSendAll = false;
              const supplierTon = await reqExec(() =>
                getTon(supplierAddress)
              );
              if (supplierTon == 0) {
                sourceSecret.log("Running out of money, quit!");
                return
              }
              if (amount >= supplierTon) {
                amount = supplierTon;
                isSendAll = true;
              }
              sourceSecret.log(
                `Send ${isSendAll ? "all " : ""}${amount} TON from ${sourceSecret.isV5 ? "V5" : "V4"} wallet to address ${nonBounceDestAddress} (${destSecret.id}) (${destSecret.isV5 ? "V5" : "V4"})`
              );
              if (isSendAll) {
                await reqExec(() =>
                  sourceSecret.isV5 ? sendAllTonV5(sourceSecret, nonBounceDestAddress) : sendAllTon(sourceSecret, nonBounceDestAddress)
                );
              } else {
                await reqExec(() =>
                  sourceSecret.isV5 ? sendTonV5(sourceSecret, nonBounceDestAddress, amount) : sendTon(sourceSecret, nonBounceDestAddress, amount)
                );
              }
              sourceSecret.log(
                ` => SUCCESS: Send ${amount} TON from ${sourceSecret.isV5 ? "V5" : "V4"} wallet to address ${nonBounceDestAddress} (${destSecret.id}) (${destSecret.isV5 ? "V5" : "V4"})`
              );
              return;
            } catch (e) {
              sourceSecret.error(`ERROR: ${e?.response?.data?.error || e?.message}`);
            }
          }
        })
      waitTasks.push({ secret: destSecret, task: task });
      missingTon -= amount;
      sourceSecret.ton -= amount;
      currentReceiverTon += amount;
    }
  }
  console.log(`Executing ${waitTasks.length} tasks`);
  await Promise.all(waitTasks.map(({ secret, task }) => exec(async () => {
    try {
      await task()
    } catch (e) {
      secret.error(e);
    }
  })));
  await sleep(10)
  console.log(`Done ${waitTasks.length} tasks`);
};

const fetchTonAmount = async (secrets) => {
  return (
    await Promise.all(
      secrets.map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < 3) {
            try {
              let onChainAddress = secret.isV5 ? (await secret.getWalletV5())?.address : (await secret.getWallet())?.address;
              if (!onChainAddress) return null;
              let onChainTon = await reqExec(() => getTon(onChainAddress));
              secret.ton = onChainTon;
              return secret;
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
