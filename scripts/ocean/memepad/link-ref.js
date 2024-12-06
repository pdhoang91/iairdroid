import { sleep } from "../../../utils/helper.js";
import {
  getRefCount,
  getRefId,
  login,
  loginMemeCulture,
} from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllOceanAddress();
  await Promise.all(secrets.map((secret) => exec(async () => {
    while (true) {
      try {
        if (!secret.initParams) return
        await login(secret);
        return
      } catch (e) {
        if (e?.response?.status == 401) return
        // secret.error(e);
        secret.log(`ERROR: ${e?.message}`);
        await sleep(1);
      }
    }
  })))
  let tasks = []
  for (let i = 0; i < secrets.length; i++) {
    let refProvider = secrets[i - 1];
    let secret = secrets[i];
    let refId;
    if (refProvider) {
      refId = getRefId(refProvider);
    }
    if (!secret.initParams) continue
    tasks.push(async () => {
      while (true) {
        try {
          if (!refId) {
            secret.log("Use default refId")
          } else {
            secret.log(`Use refId ${refId}`)
          }
          await loginMemeCulture(secret, refId);
          if (refProvider) {
            const refCount = await getRefCount(refProvider);
            refProvider.log(`Having ${refCount} referral!`);
          }
          return
        } catch (e) {
          // secret.error(e);
          secret.log(`ERROR: ${e?.message}`);
          await sleep(1);
        }
      }
    })
  }
  await Promise.all(tasks.map((fn) => exec(async () => await fn())))
};

main();
