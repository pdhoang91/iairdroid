import {
  getAccountLevelAndMultiple,
  getCurrentOcean,
  getCurrentSui,
} from "../../../utils/balance-ocean.js";
import { getPoint, login } from "../../../utils/ocean.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const main = async () => {
  const secrets = await getAllOceanAddress();
  for (const sender of secrets) {
    const { id, address } = sender;
    let [_, sui, ocean] = await Promise.all([
      login(sender),
      getCurrentSui(address),
      getCurrentOcean(address),
    ]);
    const { point } = await getPoint(sender)
    let { level } = await getAccountLevelAndMultiple(address);
    console.log(
      `${id} ${address} lv${level} SUI=${sui} OCEAN=${ocean} Point=${point}`
    );
  }
};

main();
