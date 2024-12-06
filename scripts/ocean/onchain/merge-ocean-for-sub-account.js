import { seedphases } from "../../../config/secret.js";
import { getCurrentOcean, mergeOcean } from "../../../utils/balance-ocean.js";
import { getDerivativeAddress } from "../../../utils/wallet.js";
import exec from "../../../utils/worker.js";

const main = async () => {
  await Promise.all(
    seedphases.map(async (seedphase, x) => {
      let { name } = seedphases[x];
      await Promise.all(
        Array.from(Array(99).keys()).map(
          async (i) =>
            await exec(async () => {
              if (i == 0) return;
              const senderAddress = await getDerivativeAddress(name, i);
              const ocean = await getCurrentOcean(senderAddress.address);
              if (ocean == 0) {
                return;
              }
              console.log(`Merge ocean for ${name}-${i} wallet`);
              const response = await mergeOcean(senderAddress);
              if (!response) {
                return;
              } else if (response.effects.status.status != "success") {
                console.log(`Swap fail, response: ${JSON.stringify(response)}`);
              }
            })
        )
      );
    })
  );
};

main();
