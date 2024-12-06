import { newSemaphore } from "../../utils/semaphore.js";
import {
  autoClick,
  getSpinnerInitData,
  register,
  selectSpinner,
  upgradeSpinner,
} from "../../utils/spinner.js";
import { getAllSpinnerAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const MAX_LEVEL = 20;

const main = async () => {
  const secrets = await getAllSpinnerAddress();

  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          try {
            await register(secret);
            let { user, spinners, levels } = await getSpinnerInitData(secret);
            let { mainSpinnerId } = user;
            spinners.sort((s1, s2) => s2.level - s1.level);
            for (const currentSpinner of spinners) {
              const getNextLevel = (currentLvl) => {
                return levels.find(
                  ({ level }) => level == currentLvl + 1 && level <= MAX_LEVEL
                );
              };
              let currentLevel = currentSpinner.level;

              while (true) {
                const nextLevel = getNextLevel(currentLevel);
                if (nextLevel && user.balance > nextLevel.price) {
                  secret.log(
                    `(Balance = ${user.balance}) Upgrade spinner ${currentSpinner.id} to level ${nextLevel.level} (price ${nextLevel.price})`
                  );
                  try {
                    if (currentSpinner.id != mainSpinnerId) {
                      secret.log(
                        `Set spinner ${currentSpinner.id} as default spinner`
                      );
                      await selectSpinner(secret, currentSpinner.id);
                      mainSpinnerId = currentSpinner.id;
                    }
                    await autoClick(
                      secret,
                      true,
                      async (fn) => await fn(),
                      false
                    );
                    await upgradeSpinner(secret, currentSpinner.id);
                    currentLevel++;
                    await autoClick(secret, true);
                    let newData = await getSpinnerInitData(secret);
                    user = newData.user;
                  } catch (e) {
                    secret.error(e);
                  }
                } else {
                  break;
                }
              }
            }
          } catch (e) {
            console.error(`${secret.id} ERROR: ${e.message}`);
          }
        })
    )
  );
};

main();
