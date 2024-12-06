
import { sleep } from "../../../utils/helper.js";
import { getMySquad, joinSquad, leaveSquad, login } from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(100);
const SQUAD_ID = 678;
const force = true;

const main = async () => {
  const secrets = await getAllOceanAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                if (!secret.initParams) return
                await login(secret);
                let mySquad = await getMySquad(secret);
                let isJoinSquad = mySquad;
                if (mySquad && mySquad.id != SQUAD_ID && force) {
                  secret.log(`Leave squad ${mySquad.name}`)
                  await leaveSquad(secret)
                }

                if (!isJoinSquad) {
                  secret.log(`Join squad ${SQUAD_ID}`);
                  await joinSquad(
                    secret,
                    SQUAD_ID
                  );
                  secret.log(`Join squad success!`);
                }
                return;
              } catch (e) {
                if(e?.response?.status == 401) return
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
