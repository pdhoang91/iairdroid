import { sleep } from "../../utils/helper.js";
import {
  getBalance,
  getLinkedWallets,
  getPetsData,
  getPixelLevel,
} from "../../utils/pixelVerse.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPixelVerseAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const SHOW_BALANCE = false;
const SHOW_PET = false;
const SHOW_LEVEL = true;
const MAX_RETRY = 3;

const main = async () => {
  const secrets = await getAllPixelVerseAddress();
  let c = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          let retry = 0;
          while (retry <= MAX_RETRY) {
            try {
              let balance = 0;
              if (SHOW_BALANCE) {
                balance = await getBalance(secret);
              }

              let pets = [],
                league = "",
                level = "";
              if (SHOW_PET) {
                const petData = await getPetsData(secret);
                pets = petData.data;
              }
              if (SHOW_LEVEL) {
                const levelData = await getPixelLevel(secret);
                league = levelData.league;
                level = levelData.value;
              }

              const wallets = await getLinkedWallets(secret);
              const walletStr = wallets
                .map(
                  ({ address, isMain }) => address + (isMain ? " (main)" : "")
                )
                .join(", ");
              const petStr = pets
                .map(
                  ({ name, rarity, userPet }) =>
                    `${name}(r=${rarity},lv=${userPet.level})`
                )
                .join(" | ");
              while (true) {
                if (c == i) {
                  console.log(
                    `${secret.id} -- ${balance} (lv=${level} | ${league} | ${pets.length} pets) | ${walletStr}`
                  );
                  break;
                }
                await sleep(0.05);
              }
              c++;
              return;
            } catch (e) {
              if (retry == MAX_RETRY) {
                c++;
                return;
              }
              retry++;
              while (true) {
                if (c == i) {
                  console.log(`${secret.id} Lỗi: ${e.message}`);
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
