import { JSONStringtify, parseTgUserFromInitParams, sleep } from "../../../utils/helper.js";
import { getWeweBalance, loginMemeCulture } from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllOceanAddress();
  let total = 0,
    tgMap = {};
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                if (!secret.initParams) return
                const { id } = parseTgUserFromInitParams(secret.initParams);
                await loginMemeCulture(secret);
                let { balance } = await getWeweBalance(secret);
                balance = parseFloat(balance);
                if (!tgMap[`${id}`]) {
                  secret.log(`Got ${balance} WEWE!`);
                  total += balance;
                  tgMap[`${id}`] = balance;
                }
                return;
              } catch (e) {
                if(e?.response?.status == 401) return
                // console.error(e);
                // secret.error(e);
                secret.log(`ERROR: ${JSONStringtify(e?.response?.data?.message) || e?.message}`);
                await sleep(1);
              }
            }
          }
        })
    )
  );
  console.log(`Total ${total} WEWE airdrop!`);
};

main();
