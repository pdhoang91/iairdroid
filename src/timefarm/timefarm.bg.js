import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { newSemaphore } from "../../utils/semaphore.js";

import {
  login,
  getFarmInfo,
  getFarmStart,
  getFarmFinish,
} from "../../utils/timefarm.js";
import { sleep, toHHMMSS } from "../../utils/helper.js";

const { exec } = newSemaphore(100);

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-timefarm-${fileName}`, async (event) => {
    event.sender.send(
      `${fileName}-console`,
      `start-claim-timefarm-${fileName}`
    );

    const secrets = await getSecretsByFileName(fileName);
    event.sender.send(
      `${fileName}-console`,
      `Đã load ${secrets.length} địa chỉ!`
    );
    await Promise.all(
      secrets.map(async (secret) => {
        secret = { ...secret };
        secret.log = (msg) => {
          msg = `${secret.id}${secret.proxy ? " (proxy)" : ""} ${msg}`;
          event.sender.send(`${fileName}-console`, msg);
          console.log(msg);
        };
        secret.error = (e) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${
              e?.status ? ` (status=${e?.status})` : ""
            }: ${
              e?.response?.data?.message ||
              e?.data?.message ||
              e?.message ||
              JSON.stringify(e)
            }`
          );
          console.error(e);
        };
        await startClaim(secret);
      })
    );
  });
};

const startClaim = async (secret) => {
  // get progress
  // get token can claim
  // check if token can claim is greater 0, then claim

  let $sleepIn = 0; //seconds to sleep
  while (true) {
    const now = new Date();
    try {
      let { access_token, data } = await exec(() => login(secret));
      if (access_token) {
        secret.log(`Get Farm Info...`);
        let farmInfo = await exec(() =>  getFarmInfo(secret, access_token));
        if (farmInfo) {
          if (farmInfo.activeFarmingStartedAt == null) {
            secret.log(`Not Yet Started Farm -> Start Farm...`);
            let firtClaim = await exec(() => getFarmStart(secret, access_token));
            secret.log(`Started Farm Success`);
            const startedAt = new Date(farmInfo.activeFarmingStartedAt);
            const duration = farmInfo.farmingDurationInSec * 1000;
            const availableClaimAt = new Date(startedAt.getTime() + duration);
            $sleepIn = availableClaimAt.getTime() - now.getTime();
          } else {
            // tinh ra h co the claim: x
            //  x > now -> claim -> start claim
            // x < now -> sleep(now-x)

            const startedAt = new Date(farmInfo.activeFarmingStartedAt);
            const duration = farmInfo.farmingDurationInSec * 1000;
            const availableClaimAt = new Date(startedAt.getTime() + duration);
            if (now >= availableClaimAt) {
              // can claim
              // then start farm
              // sleep
              let claimFarm = await exec(() => getFarmFinish(secret, access_token));
              secret.log(`Claim Finish...`);
              await sleep(5);
              let firtClaim = await exec(() => getFarmStart(secret, access_token));
              secret.log(`Start Farm Success`);

              const startedAt2 = new Date(firtClaim.activeFarmingStartedAt);
              const duration2 = firtClaim.farmingDurationInSec * 1000;
              const availableClaimAt2 = new Date(
                startedAt2.getTime() + duration2
              );
              $sleepIn = availableClaimAt2.getTime() - now.getTime();
            } else {
              // can't claim
              // sleep in (availableClaimAt - now)
              secret.log(
                `It's not time to Claim. Should sleep ${toHHMMSS(
                  $sleepIn / 1000
                )}... `
              );
              $sleepIn = availableClaimAt.getTime() - now.getTime();
            }
          }
        }
      }
    } catch (e) {
      secret.error(e);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      secret.log(`Sleep for ${$sleepIn}s | ${toHHMMSS($sleepIn / 1000)}... `);
      await new Promise((resolve) => setTimeout(resolve, $sleepIn));
    }
  }
};
