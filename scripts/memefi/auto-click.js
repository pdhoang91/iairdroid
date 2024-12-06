import { getMFGameConfig, mFTap } from "../../utils/memefi.js";
import {
  getAllMemefiAddress,
} from "../../utils/wallet.js";

const claimForerver = async (secret) => {
  while (true) {
    let nextTime = 1000;
    try {
      let {
        coinsAmount,
        currentEnergy,
        nonce,
        freeBoosts,
        weaponLevel,
        energyRechargeLevel,
        maxEnergy,
      } = await getMFGameConfig(secret);
      let earnPerTap = weaponLevel + 1,
        rechargeSpeed = energyRechargeLevel + 1;
      let {
        currentTurboAmount,
        maxTurboAmount,
        currentRefillEnergyAmount,
        maxRefillEnergyAmount,
      } = freeBoosts;
      while (currentEnergy < earnPerTap) {
        console.log(
          `${secret.id} Đang tap ${10} cái (còn ${(
            currentEnergy / earnPerTap
          ).toFixed(0)} cái)`
        );
        let tapData = await mFTap(secret, nonce, 10);
        currentEnergy = tapData.currentEnergy;
        weaponLevel = tapData.weaponLevel;
        energyRechargeLevel = tapData.energyRechargeLevel;
        maxEnergy = tapData.maxEnergy;
        earnPerTap = weaponLevel + 1;
        rechargeSpeed = energyRechargeLevel + 1;
      }
      nextTime = (maxEnergy / rechargeSpeed).toFixed(0) * 1000;
    } catch (e) {
      console.error(e);
    } finally {
      console.log(
        `${secret.id} Đặt lịch tap sau ${(nextTime / 60_000).toFixed(0)} phút`
      );
      await new Promise((resolve) => setTimeout(resolve, nextTime));
    }
  }
};

const main = async () => {
  const secrets = await getAllMemefiAddress();
  await Promise.all(
    secrets.map(async (secret) => {
      await claimForerver(secret);
    })
  );
};

main();
