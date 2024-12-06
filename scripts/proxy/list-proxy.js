import { getCountryCode } from "../../utils/proxy.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllProxyAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllProxyAddress();
  let c = 0;
  await Promise.all(
    secrets.map(async (secret, i) => {
      try {
        const { countryCode, continentCode } = await exec(() =>
          getCountryCode(secret)
        );
        while (true) {
          if (c == i) {
            console.log(
              `${secret.id} ${secret.privateKey} COUNTRY=${countryCode} CONTINENT=${continentCode}`
            );
            c++;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (e) {
        while (true) {
          if (c == i) {
            console.log(`${secret.id} ERROR: ${e.message}`);
            c++;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return null;
      }
    })
  );
};

main();
