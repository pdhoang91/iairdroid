import { JSONStringtify } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import {
  getRankData,
  login,
  upgradeRank,
} from "../../utils/tomarket.js";
import { getAllTomarketAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);

const main = async () => {
  const secrets = await getAllTomarketAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            let rankData;
            while (true) {
              try {
                let access_token = await login(secret);
                rankData = await getRankData(secret, access_token, true);
                if (!rankData) {
                  secret.log(`Not found rank data: ${JSONStringtify(rankData)}`);
                  return;
                }
                if (!rankData.isCreated) return
                if (!rankData.unusedStars) return
                const unusedStars = parseInt(rankData.unusedStars)
                secret.log(`Use ${unusedStars} stars to upgrade rank`);
                const { currentRank, isUpgrade } = await upgradeRank(
                  secret,
                  access_token,
                  unusedStars
                );
                if (isUpgrade) {
                  secret.log(
                    `Upgraded to level ${currentRank.level}, rank ${currentRank?.rank}`
                  );
                } else {
                  secret.log("Upgrade rank success");
                }
                return;
              } catch (e) {
                secret.error(e);
                if (e?.message == "Invalid Token.") return
                if (e?.message?.includes?.("You dose not have enough stars")) {
                  // console.log(rankData)
                  return
                }
              }
            }
          }
        })
    )
  );
};

main();
