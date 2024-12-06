import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import {
  getTickets,
  login,
  raffle,
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
            while (true) {
              try {
                let access_token = await login(secret);
                let { ticket_spin_1 } = await getTickets(secret, access_token)
                secret.log(`Having ${ticket_spin_1} tickets`)
                while(ticket_spin_1 > 0) {
                  const {results} = await raffle(secret, access_token)
                  secret.log(`Raffle success, got ${results.map(({amount, type}) => `+${amount} ${type}`).join(", ")}`)
                  ticket_spin_1--;
                  await sleep(2);
                }
                return;
              } catch (e) {
                secret.error(e);
                if (e?.message == "Invalid Token.") return
              }
            }
          }
        })
    )
  );
};

main();
