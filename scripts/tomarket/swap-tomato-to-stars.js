import { newSemaphore } from "../../utils/semaphore.js";
import {
  getCurrentTomato,
  login,
  swapTomatoToStars,
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
                // await showWitchPump(secret, access_token);
                // await isTaskExists(secret, access_token);
                // const history = await getTomatoHistory(secret, access_token);
                // console.log(history);
                // const { tomaAirDrop } = await checkAirdrop(
                //   secret,
                //   access_token
                // );
                // if (!tomaAirDrop?.amount || tomaAirDrop?.amount == 0) {
                //   secret.log("Not eligible");
                //   return;
                // }
                const { balance } = await getCurrentTomato(
                  secret,
                  access_token
                );
                const currentBalance = parseInt(balance);
                if (currentBalance > 20_000) {
                  const stars = Math.floor(currentBalance / 20_000);
                  const balanceToSwap = stars * 20_000;
                  secret.log(`Swap ${balanceToSwap} tomato to ${stars} stars`);
                  const { success } = await swapTomatoToStars(
                    secret,
                    access_token
                  );
                  if (success) {
                    secret.log(
                      `Swap ${balanceToSwap} tomato to ${stars} stars SUCCESS!`
                    );
                  } else {
                    secret.log(
                      `Swap ${balanceToSwap} tomato to ${stars} stars FAIL!`
                    );
                  }
                }
                return;
              } catch (e) {
                // console.error(e);
                secret.error(e);
                if (e?.message == "Invalid Token.") return
                // return
              }
            }
          }
        })
    )
  );
};

main();
