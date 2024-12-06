import { sleep } from "../../utils/helper.js";
import { getCoinBalance, login, trade } from "../../utils/memelandtg.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllMemelandtgAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);

const main = async () => {
  const secrets = await getAllMemelandtgAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                const token = await login(secret)
                const balances = await getCoinBalance(secret, token);
                for (const { name, balance } of balances) {
                  if (name == "meme") continue
                  if (balance == 0) continue
                  secret.log(`Swapped ${balance} ${name?.toUpperCase()} for MEME`)
                  const { MEME, ok } = await trade(secret, token, name?.toUpperCase(), "MEME", balance)
                  if (ok) {
                    secret.log(`Swapped ${balance} ${name?.toUpperCase()} to ${MEME} MEME!`)
                  }
                }
                return;
              } catch (e) {
                console.error(e)
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
