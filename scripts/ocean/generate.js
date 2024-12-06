import { seedphases } from "../../config/secret.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { generateWalletDerivativeAddresses } from "../../utils/wallet.js";

const { exec } = newSemaphore(1);

const main = async () => {
  for (let i = 0; i < seedphases.length; i++) {
    let { name, seedphase } = seedphases[i];
    console.log("              ============================");
    let addresses = await generateWalletDerivativeAddresses(seedphase);
    await Promise.all(
      addresses.map(
        async ({ index, privateKey, address, nearPrivateKey }) =>
          await exec(async () => {
            {
              console.log(
                `${name}-${index} | ${privateKey} | ${address}`
              );
            }
          })
      )
    );
  }
};

main();
