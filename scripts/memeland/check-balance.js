import { getMemeWalletInfo, isMemeConnectedX } from "../../utils/memeland.js";
import { getAllMemeAddress } from "../../utils/wallet.js";
import exec from "../../utils/worker.js";

const main = async () => {
  const secrets = await getAllMemeAddress();
  let c = -1
  await Promise.all(
    secrets.map(
      async (secret, i) =>
        await exec(async () => {
          {
            try {
              const [{ steaks, wallet }, connectedX] = await Promise.all([getMemeWalletInfo(secret), isMemeConnectedX(secret)])
              while (c < i) {
                if (c == i - 1) {
                  console.log(`${secret.id} ${wallet} ${steaks.total} STEAK, (${connectedX ? "X connected" : "Not connect X"})`);
                  c++;
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
              }
            } catch (e) {
              console.log(`${secret.id} ERROR: ${e.message || e.data.message}`);
              while (true) {
                if (c == i - 1) {
                  c++;
                  break;
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
              }
            }
          }
        })
    )
  );
};

main();
