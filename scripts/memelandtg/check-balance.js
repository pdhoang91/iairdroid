
import { sleep } from "../../utils/helper.js";
import { getCoinBalance, login } from "../../utils/memelandtg.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllCatsAddress, getAllMemelandtgAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const { exec: reqExec } = newSemaphore(200);
const MAX_RETRY = 3;

const main = async () => {
  const secrets = await getAllMemelandtgAddress();
  let c = -1, total = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            let retry = 0;
            while (retry < MAX_RETRY) {
              try {
                const token = await login(secret)
                const { balance } = (await getCoinBalance(secret, token)).find(({ name }) => name == "meme")
                total += balance
                while (c < i) {
                  if (c == i - 1) {
                    secret.log(
                      `Balance=${balance}`
                    );
                    c++;
                  }
                  await sleep(0.05);
                }
                return;
              } catch (e) {
                retry++;
                while (true) {
                  if (c == i - 1) {
                    console.log(`${secret.id} Lỗi: ${e.message}`);
                    if (retry == MAX_RETRY) {
                      c++;
                    }
                    break;
                  }
                  await sleep(0.05);
                }
              }
            }
          }
        })
    )
  );
  console.log(`Total ${total} MEME reward!`)
};

main();
