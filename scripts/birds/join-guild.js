import { getMyGuild, joinGuild, leaveGuild } from "../../utils/birds.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBirdsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const GUILD_ID = "6719267ec0bd028e1999eac4";
const force = true;

const main = async () => {
  const secrets = await getAllBirdsAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                let myGuild = await getMyGuild(secret);
                let isJoinGuild = myGuild;

                if (myGuild && force && myGuild._id != GUILD_ID) {
                  secret.log(`Leave guild ${myGuild.title}`);
                  await leaveGuild(secret);
                  isJoinGuild = false;
                }

                if (!isJoinGuild) {
                  secret.log(`Join guild ${GUILD_ID}`);
                  await joinGuild(secret, GUILD_ID);
                  secret.log(`Join guild success!`);
                }
                return;
              } catch (e) {
                if (e?.response?.data == "The guild is full") {
                  secret.log("The guild is full, exit!")
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
