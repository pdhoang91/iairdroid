import { addToSecretVault } from "../../../config/secret-manager.js";
import { seedphases } from "../../../config/secret.js";
import {
  getAccountLevelAndMultiple,
  getAmountToUpgrade,
  getCurrentOcean,
  upgradeBoat,
  upgradeMesh,
} from "../../../utils/balance-ocean.js";
import { loadFile } from "../../../utils/loader.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getDerivativeAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(20);
const { exec: reqExec } = newSemaphore(2);
const MAX_MESH_LV = 1;
const MAX_MESH_LV_WITH_BOOST = 6;
const MAX_BOAT_LV = 1;
const MAX_BOAT_LV_WITH_BOOST = 6;

const main = async () => {
  let secrets = await Promise.all(
    seedphases
      .map(({ name }) =>
        Array.from(Array(99).keys()).map(async (i) => {
          return await getDerivativeAddress(name, i);
        })
      )
      .flat()
  );
  const fileName = "sponsor-account.private.csv";
  secrets = [
    ...secrets,
    ...(await addToSecretVault(
      fileName,
      loadFile("config/sponsor-account.private.csv").toString()
    )),
  ];

  await Promise.all(
    secrets.map((secret) =>
      exec(async () => {
        try {
          const { exist } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
          if (!exist) return;
          await upgradeOceanMesh(secret);
          await upgradeOceanBoat(secret);
        } catch (e) {
          console.error(`${secret.id} ${e?.message}`);
        }
      })
    )
  );
};

const upgradeOceanMesh = async (secret) => {
  let ocean = await reqExec(() => getCurrentOcean(secret.address));
  while (true) {
    try {
      let { level, multiple } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
      const maxMeshLv = multiple > 1 ? MAX_MESH_LV_WITH_BOOST : MAX_MESH_LV;
      while (level < maxMeshLv) {
        const amount = getAmountToUpgrade("mesh", level + 1);
        if (amount > ocean) return;
        console.log(
          `${secret.id} Upgrade mesh to level ${
            level + 1
          }, cost ${amount} OCEAN`
        );
        const response = await reqExec(() => upgradeMesh(secret, amount), 0.5);
        if (response.effects.status.status != "success") {
          console.log(`Sending fail, response: ${JSON.stringify(response)}`);
          continue;
        }
        level++;
        ocean -= amount;
      }
      return;
    } catch (e) {
      console.error(`${secret.id} ERROR: ${e?.message}`);
    }
  }
};

const upgradeOceanBoat = async (secret) => {
  let ocean = await reqExec(() => getCurrentOcean(secret.address));
  while (true) {
    try {
      let { boat: level, multiple } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
      const maxBoatLv = multiple > 1 ? MAX_BOAT_LV_WITH_BOOST : MAX_BOAT_LV;
      while (level < maxBoatLv) {
        const amount = getAmountToUpgrade("boat", level + 1);
        if (amount > ocean) return;
        console.log(
          `${secret.id} Upgrade boat to level ${
            level + 1
          }, cost ${amount} OCEAN`
        );
        const response = await reqExec(() => upgradeBoat(secret, amount), 0.5);
        if (response.effects.status.status != "success") {
          console.log(`Sending fail, response: ${JSON.stringify(response)}`);
          continue;
        }
        level++;
        ocean -= amount;
      }
      return;
    } catch (e) {
      // console.error(e);
      console.error(`${secret.id} ERROR: ${e?.message}`);
    }
  }
};

main();
