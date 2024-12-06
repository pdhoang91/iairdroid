import { getCountryCode } from "../../utils/proxy.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllProxyAddress } from "../../utils/wallet.js";

const {exec} = newSemaphore(100)
const COUNTRY_CODE = "US"
const CONTINENT_CODE = "NA"

const main = async () => {
  const secrets = await getAllProxyAddress();
  const data = (
    await Promise.all(
      secrets.map(async (secret) => {
        try {
          const {countryCode, continentCode} = await exec(() => getCountryCode(secret));
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
  for (const { countryCode, continentCode, proxy } of data) {
    try {
      if (CONTINENT_CODE && continentCode == CONTINENT_CODE) continue;
      if (COUNTRY_CODE && countryCode == COUNTRY_CODE) continue;
      // console.log(`${proxy} ${countryCode} ${continentCode}`);
      console.log(`${proxy}`);
    } catch (e) {
      console.log(e.message);
    }
  }
};

main();
