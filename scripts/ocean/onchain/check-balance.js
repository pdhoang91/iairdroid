import { seedphases } from "../../../config/secret.js";
import {
  getAccountLevelAndMultiple,
  getCurrentOcean,
  getCurrentSui,
} from "../../../utils/balance-ocean.js";
import { getPoint, login } from "../../../utils/ocean.js";
import { getDerivativeAddress } from "../../../utils/wallet.js";

const main = async () => {
  for (let x = 0; x < seedphases.length; x++) {
    let { name } = seedphases[x];
    for (let i = 0; i < 99; i++) {
      const secret = await getDerivativeAddress(name, i);
      const { id, address } = secret;
      let [_, sui, ocean] = await Promise.all([
        login(secret),
        getCurrentSui(address),
        getCurrentOcean(address),
      ]);
      const { point } = await getPoint(secret)
      let { level, multiple, boat } = await getAccountLevelAndMultiple(address);
      console.log(
        `${id} ${address} mesh=${level}, boat=${boat}, mul=${multiple} SUI=${sui} OCEAN=${ocean} Point=${point}`
      );
    }
  }
};

main();
