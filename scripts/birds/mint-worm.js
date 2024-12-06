import { mintWormOnchain } from "../../utils/balance-birds.js";
import { getCurrentSui } from "../../utils/balance-ocean.js";
import { getCatchWormSignature, getLockWormList, getWallet } from "../../utils/birds.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBirdsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(50);
const { exec: reqExec } = newSemaphore(2);
const IGNORE_TYPE = ["common", "rare"];
const MIN_SUI = 0.007;

const main = async () => {
  let secrets = await getAllBirdsAddress();
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          while (true) {
            try {
              const lockWormList = await getLockWormList(secret, 50);
              const finalList = lockWormList.data.filter(({ type }) => !IGNORE_TYPE.includes(type))
              if (finalList.length == 0) return;
              secret.log(`Found ${finalList.length}/${lockWormList.meta.totalCount}: ${finalList.map(({ type, metadata }) => `[${type}${metadata ? JSON.stringify(metadata) : ""}]`)}`)
              if (!secret.address) {
                secret.log("Missing seedphrase")
                return
              }
              let { address: bindedAddress } = await getWallet(secret);
              if (!bindedAddress) {
                secret.log("Not linked wallet");
                return
              }
              if (secret.address != bindedAddress) {
                secret.log("Address not match")
                return
              }
              for (const worm of finalList) {
                const sui = await reqExec(() => getCurrentSui(secret.address));
                if (sui < MIN_SUI) {
                  secret.log(`Not having enough SUI, having ${sui} SUI`);
                  return
                }
                secret.log(`Fetching message and signature`)
                const unlockData = await getCatchWormSignature(secret, worm.id, secret.address);
                if (!unlockData) continue
                const { message, signature } = unlockData;
                const messageStr = Buffer.from(message.data).toString("hex"), signatureStr = Buffer.from(signature.data).toString("hex")
                secret.log(`Mint worm ${worm.id} with address ${secret.address}`);
                await reqExec(() => mintWormOnchain(secret, messageStr, signatureStr, worm.id))
                secret.log(`Mint worm ${worm.id} with address ${secret.address} SUCCESS!`)
              }
              return
            } catch (e) {
              console.error(e);
              secret.error(e);
              await sleep(1);
            }
          }

        })
    )
  );
};

main();
