import {
  getSpellSetting,
  getSpellUser,
  isSpellClaimable,
  upgradeBoost,
  upgradeMagic,
  waitUntilTaskDone,
} from "../../utils/spell.js";
import { getAllSpellAddress } from "../../utils/wallet.js";
import exec from "../../utils/worker.js";

const UPGRADE_TARGET = "boost"; // magic | boost

const main = async () => {
  const secrets = await getAllSpellAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          try {
            const setting = await getSpellSetting(secret);
            const user = await getSpellUser(secret);
            const claimData = await isSpellClaimable(secret);
            const getNextLevel = (currentLvl) => {
              return (
                UPGRADE_TARGET == "boost"
                  ? setting.booster_upgrades
                  : setting.magic_upgrades
              ).find(({ level }) => parseInt(level) == currentLvl + 1);
            };
            const upgradeLvl = async (secret) => {
              return await (UPGRADE_TARGET == "boost"
                ? upgradeBoost(secret)
                : upgradeMagic(secret));
            };
            let currentLevel =
              UPGRADE_TARGET == "boost"
                ? claimData.boosterLvl
                : claimData.magicLvl;

            while (true) {
              const nextLevel = getNextLevel(currentLevel);
              if (nextLevel && user.balance > nextLevel.upgrade_price) {
                console.log(
                  `${secret.id} Upgrade ${
                    UPGRADE_TARGET == "boost" ? "boost" : "magic"
                  } to level ${nextLevel.level}`
                );
                const { id: taskId } = await upgradeLvl(secret);
                await waitUntilTaskDone(secret, taskId);
                user.balance -= nextLevel.upgrade_price
                currentLevel++;
              } else {
                break;
              }
            }
          } catch (e) {
            console.error(`${secret.id} ERROR: ${e.message}`)
          }
        })
    )
  );
};

main();
