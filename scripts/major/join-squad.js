import { sleep } from "../../utils/helper.js";
import { joinSquad, leaveSquad, login } from "../../utils/major.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllMajorAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const TRIBE_ID = "72bc0297-5d09-4eec-8a76-5ed95368e95a";
const force = true;
const SQUAD_ID = 2154561585;

const main = async () => {
  const secrets = await getAllMajorAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                const { user } = await login(secret, null, false);
                let { squad_id } = user;

                if (squad_id && force && squad_id != SQUAD_ID) {
                  secret.log(`Leave squad`);
                  await leaveSquad(secret);
                  squad_id = null;
                }

                if (!squad_id) {
                  secret.log(`Join squad ${SQUAD_ID}`);
                  await joinSquad(secret, SQUAD_ID);
                  secret.log(`Join squad success!`);
                }
                return;
              } catch (e) {
                if (e?.response?.data?.detail?.title == "User with is already a member of squad") {
                  secret.log("Already join squad, quit!")
                  return
                }
                secret.error(e?.message);
                await sleep(1);
              }
            }
          }
        })
    )
  );
};

main();
