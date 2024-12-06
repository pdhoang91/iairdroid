
import { getSpellUser, isSpellClaimable } from "../../utils/spell.js";
import { getAllSpellAddress } from "../../utils/wallet.js";
import exec from "../../utils/worker.js";

const main = async () => {
  const secrets = await getAllSpellAddress();
  let c = -1,
    totalMana = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            try {
              const user = await getSpellUser(secret);
              const { timeToFullCapacity, magicLvl, boosterLvl } =
                await isSpellClaimable(secret);
              let balance = (user.balance / 1_000_000).toFixed(2);
              totalMana += parseInt(balance);
              while (c < i) {
                if (c == i - 1) {
                  console.log(
                    `${secret.id} ${user.address
                    } ${balance} MANA | magicLvl=${magicLvl}, boostLvl=${boosterLvl} | Next claim: ${(
                      timeToFullCapacity / 60_000
                    ).toFixed(2)} minutes`
                  );
                  c++;
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
              }
            } catch (e) {
              console.log(`${secret.id} ERROR: ${e.message || e.data.message}`)
              while(true) {
                if (c == i - 1) {
                  c++;
                  break
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
              }
            }
          }
        })
    )
  );
  console.log(`Total ${totalMana} MANA`)
};

main();
