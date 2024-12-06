import { newSemaphore } from "../../utils/semaphore.js";
import { getAllYescoinAddress } from "../../utils/wallet.js";
import {
  getMySquad,
  joinSquad,
  leaveSquad,
  login,
} from "../../utils/yescoin.js";

const { exec } = newSemaphore(100);
const SQUAD_TG_NAME = "@clgroup1";
const SQUAD_TG_LINK = "https://t.me/clgroup1"
const force = true;

const main = async () => {
  const secrets = await getAllYescoinAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                let access_token = await login(secret);
                let { isJoinSquad, squadInfo } = await getMySquad(
                  secret,
                  access_token
                );

                if (isJoinSquad && force && squadInfo.squadTgLink != SQUAD_TG_LINK) {
                    secret.log(`Leave squad ${squadInfo.squadTgLink}`)
                    await leaveSquad(secret, access_token)
                    isJoinSquad = false
                }

                if (!isJoinSquad) {
                  secret.log(`Join squad ${SQUAD_TG_NAME}`);
                  await joinSquad(
                    secret,
                    access_token,
                    SQUAD_TG_NAME
                  );
                  secret.log(`Join squad success!`);
                }
                return;
              } catch (e) {
                secret.log(`ERROR: ${e?.message}`);
                if (e?.message == "invalid code error") return
              }
            }
          }
        })
    )
  );
};

main();
