import {
  getWormList,
  getWormLowestPrice,
  listWormForSale,
} from "../../utils/birds.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBirdsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  let secrets = await getAllBirdsAddress();
  let totalListing = 0,
    totalValueListing = 0;
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          while (true) {
            try {
              const { data: myWorms } = await getWormList(secret, 50);
              const unlistedWorms = myWorms.filter(
                ({ status }) => status == "minted"
              );
              if (unlistedWorms.length == 0) {
                const listedWorms = myWorms.filter(
                  ({ status }) => status == "listed"
                );
                if (listedWorms.length > 0) {
                  listedWorms.forEach(({ price }) => {
                    totalListing++;
                    totalValueListing += Math.round(price / 1_000_000_000);
                  });
                  secret.log(
                    `Found ${listedWorms.length} listed worms: ${listedWorms
                      .map(
                        ({ type, price }) =>
                          `[${type}] -> ${Math.round(price / 1_000_000_000)}`
                      )
                      .join(", ")}`
                  );
                }
                return;
              }
              secret.log(
                `Found ${unlistedWorms.length}/${myWorms.length} unlisted worms`
              );
              for (const worm of unlistedWorms) {
                await sleep(2);
                const { id, type } = worm;
                const lowestPrice = await getWormLowestPrice(secret, type);
                const listingPrice = lowestPrice - 5;
                secret.log(
                  `List worm ${id} (${type}) with price ${listingPrice}`
                );
                await listWormForSale(secret, id, listingPrice);
                secret.log(
                  `List worm ${id} (${type}) with price ${listingPrice} SUCCESS`
                );
              }
            } catch (e) {
              // console.error(e);
              secret.error(e);
              await sleep(1);
            }
          }
        })
    )
  );
  console.log(
    `Total listing ${totalListing} worms (worth ${totalValueListing} BIRD)!`
  );
};

main();
