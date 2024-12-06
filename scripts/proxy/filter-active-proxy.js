import { getCountryCode } from "../../utils/proxy.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllProxyAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(1000)

const main = async () => {
  const secrets = await getAllProxyAddress();
  const data = (
    await Promise.all(
      secrets.map(async (secret) => {
        try {
          const { countryCode, continentCode } = await exec(() => getCountryCode(secret));
          return {
            id: secret.id,
            ip: secret.privateKey,
            proxy: secret.proxyStr,
            countryCode,
            continentCode
          };
        } catch (e) {
          console.log(e.message);
          return null;
        }
      })
    )
  ).filter((data) => data);
  for (const { proxy } of data) {
    try {
      console.log(`${proxy}`);
    } catch (e) {
      console.log(e.message);
    }
  }
};

main();
