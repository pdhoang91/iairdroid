import {
  getBarAmount,
  getBoxData,
  getPetInfo,
  getUserInfo,
  login,
} from "../../utils/djdog.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllDjDogAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(30);

const main = async () => {
  const secrets = await getAllDjDogAddress();
  let c = -1;
  let totalBox = 0, totalHsk = 0;
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            try {
              let { access_token, data } = await login(secret);
              let { level } = await getPetInfo(secret, access_token);
              let { inviteNum, bindTonAddress, hskAmount } = await getUserInfo(secret, access_token);
              let { goldAmount } = await getBarAmount(secret, access_token);
              const { boxAmount } = await getBoxData(secret, access_token);
              totalBox += boxAmount;
              totalHsk += parseFloat(hskAmount);
              while (c < i) {
                if (c == i - 1) {
                  secret.log(
                    `Level=${level} (wallet=${
                      bindTonAddress ? "CONNECTED" : "NOT connected"
                    } | invite=${inviteNum}) Gold=${goldAmount} Hsk=${hskAmount} BoxAmount=${boxAmount}`
                  );
                  c++;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
            } catch (e) {
              while (true) {
                if (c == i - 1) {
                  c++;
                  secret.error(e);
                  break;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
            }
          }
        })
    )
  );
  console.log(`>>> Having total ${totalBox} box, total ${totalHsk} HSK!`);
};

main();
