import { seedphases } from "../../../config/secret.js";
import { mergeOcean } from "../../../utils/balance-ocean.js";
import { getDefaultAddress } from "../../../utils/wallet.js";

const main = async () => {
  for (let x = 0; x < seedphases.length; x++) {
    console.log("                  ==================");
    let { name } = seedphases[x];

    const secret = await getDefaultAddress(name);
    console.log(`Merge ocean for ${secret.id} wallet`);
    const response = await mergeOcean(secret);
    if (!response) {
      continue;
    } else if (response.effects.status.status != "success") {
      console.log(`Swap fail, response: ${JSON.stringify(response)}`);
    }
  }
};

main();
