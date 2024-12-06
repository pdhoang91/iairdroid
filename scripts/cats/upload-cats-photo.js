import {
  createUser,
  getAvatar,
  upgradeAvatar,
} from "../../utils/cats.js";
import { sleep } from "../../utils/helper.js";
import { loadFile } from "../../utils/loader.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllCatsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(500);

const main = async () => {
  const secrets = await getAllCatsAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                // await createUser(secret);
                const avatar = await getAvatar(secret);
                if (avatar.attemptsUsed < 1 || (new Date(avatar.attemptTime).getTime() + 24 * 60 * 60_000) < new Date().getTime()) {
                  secret.log("Upload cat avatar")
                  const { rewards } = await upgradeAvatar(secret, "assets/cat.jpg");
                  secret.log(`Upload cat avatar SUCCESS! +${rewards} CATS`)
                }
                return;
              } catch (e) {
                // console.error(e)
                // secret.error(e);
                secret.log(`ERROR: ${e?.message}`);
                await sleep(1);
              }
            }
          }
        })
    )
  );
};

main();
