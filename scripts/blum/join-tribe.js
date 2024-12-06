import { getMyTribe, joinTribe, leaveTribe, login } from "../../utils/blum.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBlumAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const TRIBE_ID = "72bc0297-5d09-4eec-8a76-5ed95368e95a"
const force = true;

const main = async () => {
  const secrets = await getAllBlumAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                await login(secret);
                let myTribe = await getMyTribe(secret);
                let isJoinTribe = myTribe;

                if (myTribe && force && myTribe.id != TRIBE_ID) {
                  secret.log(`Leave tribe ${myTribe.title}`)
                  await leaveTribe(secret)
                  isJoinTribe = false
                }

                if (!isJoinTribe) {
                  secret.log(`Join tribe ${TRIBE_ID}`);
                  await joinTribe(
                    secret,
                    TRIBE_ID
                  );
                  secret.log(`Join tribe success!`);
                }
                return;
              } catch (e) {
                if (e?.response?.data?.message == "USER_ALREADY_IN_TRIBE") {
                  secret.log("Already join tribe, quit!")
                  return
                }
                secret.error(e);
                await sleep(1);
              }
            }
          }
        })
    )
  );
};

main();
