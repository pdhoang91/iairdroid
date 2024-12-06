import { newSemaphore } from "../../utils/semaphore.js";
import { getSpinnerInitData, register } from "../../utils/spinner.js";
import { getAllSpinnerAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllSpinnerAddress();
  let c = -1, totalSpn = 0, totalLevel = 0, totalSpinner = 0, banCount = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            try {
              await register(secret);
              const { user, spinners } = await getSpinnerInitData(secret);
              if (user.isBanned == 1) {
                banCount++;
              }
              while (c < i) {
                if (c == i - 1) {
                  let components = [];
                  for (const spinner of spinners) {
                    const {
                      address,
                      id,
                      level,
                      rarity,
                      isConfirmed,
                      isMinted,
                      isSale,
                      isSwipe,
                    } = spinner;
                    components.push(
                      `#${id}, lv ${level}, ${rarity.name} ${address ? `(${address})` : ""
                      }${isConfirmed && !isMinted ? "(minting)" : ""}${isSale ? "(on sale)" : ""
                      }${isSwipe ? "(swiped)" : ""}${level >= 12 && !isConfirmed && !isMinted
                        ? "(ready to mint)"
                        : ""
                      }`
                    );
                    totalSpinner += 1
                    totalLevel += level
                  }
                  totalSpn += user.balance || 0;
                  secret.log(
                    `${user.isBanned == 1 ? "(BANNED) " : ""}[${user?.league?.name}] Balance=${user.balance
                    } | ${components.join(
                      "\n                                "
                    )}`
                  );
                  c++;
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
              }
            } catch (e) {
              secret.error(e);
              while (true) {
                if (c == i - 1) {
                  c++;
                  break;
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
              }
            }
          }
        })
    )
  );
  console.log(`Having ${totalSpn} token, average level ${(totalLevel / totalSpinner).toFixed(2)}`)
  console.log(`Get banned ${banCount} accounts!`)
};

main();
