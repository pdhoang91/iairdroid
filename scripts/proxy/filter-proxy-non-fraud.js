import { getCountryCode } from "../../utils/proxy.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllProxyAddress } from "../../utils/wallet.js";

const {exec} = newSemaphore(100)

const main = async () => {
  const secrets = await getAllProxyAddress();
  const data = (
    await Promise.all(
      secrets.map(async (secret) => {
        try {
          const {isTrusted} = await exec(() => getCountryCode(secret));
          return {
            id: secret.id,
            ip: secret.privateKey,
            proxy: secret.proxyStr,
            isTrusted
          };
        } catch (e) {
          console.log(e.message);
          return null;
        }
      })
    )
  ).filter((data) => data).filter(({isTrusted}) => isTrusted);
  for (const { proxy } of data) {
    try {
      console.log(`${proxy}`);
    } catch (e) {
      console.log(e.message);
    }
  }
};

main();
