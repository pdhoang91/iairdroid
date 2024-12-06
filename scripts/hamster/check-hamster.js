import { getAirdropTasks, getHamsterSync } from "../../utils/hamster.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const MAX_RETRY = 3;
const ONLY_TOKEN = false;

const main = async () => {
  const secrets = await getAllHamsterAddress();
  let c = -1;
  let totalUnclaimed = 0, totalToken = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry < MAX_RETRY) {
              try {
                const sync = await getHamsterSync(secret);
                const {
                  balanceDiamonds,
                  earnPassivePerHour,
                  referralsCount,
                  airdropTasks,
                  skin,
                  achievements,
                  withdraw,
                  tokenBalance,
                } = sync;
                const isCheat = achievements.find(
                  ({ id }) => id == "cheater_1"
                );
                const { selectedSkinId, available } = skin;
                const unclaimed = ((tokenBalance?.unclaimed || 0) / 1_000_000_000).toFixed(2)
                const total = ((tokenBalance?.total || 0) / 1_000_000_000).toFixed(2)
                totalUnclaimed += parseFloat(unclaimed);
                totalToken += parseFloat(total);
                while (c < i) {
                  if (c == i - 1) {
                    const airdropWalletTask =
                      airdropTasks?.airdrop_connect_ton_wallet;
                    // let withdrawStr = withdraw.selected;
                    // if (withdraw.selected) {
                    //   withdrawStr += ` (${withdraw.info[withdraw.selected].depositAddress} | state=${withdraw.state})`
                    // }
                    if (ONLY_TOKEN) {
                      secret.log(
                        `${unclaimed}/${total}`
                      );
                    } else {
                      secret.log(
                        `${
                          isCheat ? "(CHEAT) " : ""
                        } Earn=${earnPassivePerHour} Balance=${balanceDiamonds.toFixed(2)} RefCount=${
                          referralsCount || 0
                        } Address=${
                          airdropWalletTask?.completedAt
                            ? airdropWalletTask?.walletAddress
                            : ""
                        }`
                      );
                    }
                    c++;
                  }
                  await sleep(0.05);
                }
                return;
              } catch (e) {
                retry++;
                while (true) {
                  if (c == i - 1) {
                    console.log(`${secret.id} Lỗi: ${e.message}`);
                    if (retry == MAX_RETRY) {
                      c++;
                    }
                    break;
                  }
                  await sleep(0.05);
                }
              }
            }
          }
        })
    )
  );
  console.log(`Total ${totalUnclaimed}/${totalToken} Token!`);
};

main();
