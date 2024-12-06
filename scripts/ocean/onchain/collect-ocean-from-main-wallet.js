import { seedphases } from "../../../config/secret.js";
import {
  getCurrentOcean,
  mergeOcean,
  sendOcean,
} from "../../../utils/balance-ocean.js";
import { sleep } from "../../../utils/helper.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getDefaultAddress } from "../../../utils/wallet.js";

const { exec: reqExec } = newSemaphore(2);
const RECEIVE_ADDRESS = "0xd7a3f9b0a1bc7f443e540c53f7997b75fc0b8403d35e1b3961a661d4b64134d7";
const MIN_OCEAN_TO_COLLECT = 2000;

const main = async () => {
  await Promise.all(
    seedphases.map(async (seedphase, x) => {
      let { name } = seedphases[x];
      const secret = await getDefaultAddress(name);
      while (true) {
        try {
          const ocean = await reqExec(() => getCurrentOcean(secret.address));
          if (ocean < MIN_OCEAN_TO_COLLECT) {
            secret.log(`Having ${ocean} OCEAN, require at least ${MIN_OCEAN_TO_COLLECT} OCEAN to harvesh!`);
            return
          }
          let response = await reqExec(() => mergeOcean(secret));
          if (!response) {
            return
          } else if (response.effects.status.status != "success") {
            secret.log(`Merge fail, response: ${JSON.stringify(response)}`);
            return
          }
          secret.log(`Send ${ocean} OCEAN to address ${RECEIVE_ADDRESS}`);
          response = await reqExec(() => sendOcean(secret, RECEIVE_ADDRESS, ocean, true));
          if (!response) {
            return
          } else if (response.effects.status.status != "success") {
            secret.log(`Send fail fail, response: ${JSON.stringify(response)}`);
          }
          return
        } catch (e) {
          secret.error(e);
          await sleep(1);
        }
      }
    })
  );
};
main();
