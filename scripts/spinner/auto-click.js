import { newSemaphore } from "../../utils/semaphore.js";
import { autoClick } from "../../utils/spinner.js";
import { getAllSpinnerAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);

const main = async () => {
  const secrets = await getAllSpinnerAddress();
  await Promise.all(
    secrets.map(async (secret) => {
      await autoClick(secret, false, exec, true, true);
    })
  );
};

main();
