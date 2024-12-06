import { getAllDuckchainAddress } from "../../utils/wallet.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getUserInfo, openBox } from "../../utils/duckchain.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(100);
const MAX_RETRY = 2;

const main = async () => {
  const secrets = await getAllDuckchainAddress();
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            try {
              const { boxAmount } = await reqExec(() => getUserInfo(secret));
              if (boxAmount == 0) return
              secret.log(`Opening ${boxAmount} boxes...`)
              const { obtain } = await reqExec(() => openBox(secret));
              secret.log(`Open ${boxAmount} boxes success! +${obtain} QUACK`)
              return;
            } catch (e) {
              retry++;
              console.log(`${secret.id} Lỗi: ${e.message}`);
            }
          }
        })
    )
  );
};

main();
