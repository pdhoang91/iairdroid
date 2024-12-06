import {
  buySkin,
  getHamsterSync,
  getSkin,
  getSkins,
  selectSkin,
} from "../../utils/hamster.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";
// import morsejs from "booleanmorse"

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllHamsterAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          try {
            let expectSkinId, maxSkinPrice;
            const { skin } = await getHamsterSync(secret);
            const { available, selectedSkinId } = skin;
            const availableSkinIds = available.map(({ skinId }) => skinId);
            if (expectSkinId) {
              const { name: skinName, price } = await getSkin(
                secret,
                expectSkinId
              );
              if (!available?.find?.(({ skinId }) => skinId == expectSkinId)) {
                const { balanceDiamonds } = await getHamsterSync(secret);
                if (balanceDiamonds < price) {
                  console.log(
                    `${secret.id} (Balance=${balanceDiamonds.toFixed(
                      2
                    )}) Not enough money to buy skin ${skinName}, cost ${price}`
                  );
                  return;
                }
                console.log(
                  `${secret.id} (Balance=${balanceDiamonds.toFixed(
                    2
                  )}) Buy skin ${skinName} (${expectSkinId}) with price ${price}`
                );
                await buySkin(secret, expectSkinId);
                availableSkinIds.push(expectSkinId);
              }
              if (selectedSkinId != expectSkinId) {
                console.log(
                  `${secret.id} Select skin ${skinName} (${expectSkinId}) as default`
                );
                await selectSkin(secret, expectSkinId);
              }
            }
            const skins = await getSkins(secret);
            let { balanceDiamonds } = await getHamsterSync(secret);
            for (const skin of skins) {
              const { id, name, price, condition, availableForBuy, expiresAt } = skin;
              if (expiresAt && new Date() >= new Date(expiresAt)) continue
              if (!availableForBuy) continue
              if (availableSkinIds.includes(id)) continue;
              if (balanceDiamonds < price) {
                console.log(
                  `${secret.id} (Balance=${balanceDiamonds.toFixed(
                    2
                  )}) Not enough money to buy skin ${name}, cost ${price}`
                );
                continue;
              }
              console.log(
                `${secret.id} (Balance=${balanceDiamonds.toFixed(
                  2
                )}) Buy skin ${name} (${id}) with price ${price}`
              );
              await buySkin(secret, id);
              balanceDiamonds -= price;
            }
          } catch (e) {
            console.error(e)
            console.log(`${secret.id} Lỗi: ${e.message}`);
          }
        })
    )
  );
};

main();
