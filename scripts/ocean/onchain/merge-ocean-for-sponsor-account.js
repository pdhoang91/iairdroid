import { getCurrentOcean, mergeOcean } from "../../../utils/balance-ocean.js";
import exec from "../../../utils/worker.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { addToSecretVault } from "../../../config/secret-manager.js";

const main = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __basepath = path.resolve(path.dirname(__filename), "..");
  const fileData = fs.readFileSync(
    __basepath + "/config/sponsor-account.private.csv"
  );
  const fileName = "sponsor-account.private.csv";
  const secrets = await addToSecretVault(fileName, fileData.toString());
  await Promise.all(
    secrets.map(
      async (senderAddress) =>
        await exec(async () => {
          const ocean = await getCurrentOcean(senderAddress.address);
          if (ocean == 0) {
            return;
          }
          console.log(`Merge ocean for ${senderAddress.id} wallet`);
          const response = await mergeOcean(senderAddress);
          if (!response) {
            return;
          } else if (response.effects.status.status != "success") {
            console.log(`Swap fail, response: ${JSON.stringify(response)}`);
          }
        })
    )
  );
};

main();
