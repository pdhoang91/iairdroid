import { Address } from "@ton/core";
import { ton } from "../../config/network.js";
import {
  getTon,
  getUsdt,
  nonBounceableFmt,
  sendAllTon,
  sendAllUsdt,
} from "../../utils/balance-ton.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBananaAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(5);
const { exec: reqExec } = newSemaphore(5);
const MIN_TON = 0.1;
const INCLUDE_LIST = [
  "duy - 154",
];
const MAX_RETRY = 3;
const getTargetAddress = (id) => {
  if (id.startsWith("duy")) {
    return "UQCLLVpzWJ6xzN_5zD6tAFJZzoUQL1aAX4ZE0VvhCUKiJVmY";
  } else if (id.startsWith("atung")) {
    return "UQAv8yZRzBm0SrmO5oeTOABiaHsuWui7Yt6dudRp1D4u54fm";
  } else {
    return "UQDF87bpgA02s5a92yaog5r0x5-zePGMu00iMVDCxYLbzVPf";
  }
};

const main = async () => {
  await ton();
  const secrets = await getAllBananaAddress();
  let data = await Promise.all(
    secrets
      .filter(
        ({ id }) =>
          INCLUDE_LIST.length == 0 ||
          (INCLUDE_LIST.length > 0 && INCLUDE_LIST.includes(id))
      )
      .map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < 3) {
            try {
              let onChainAddress = (await secret.getWallet())?.address;
              if (!onChainAddress) return null;
              let usdtAddress = await reqExec(() => secret.getUSDTAddress());
              let onChainTon = await reqExec(() => getTon(onChainAddress));
              let onChainUsdt = await reqExec(() =>
                getUsdt(usdtAddress.toString())
              );
              await sleep(0.5);
              const result = {
                address: onChainAddress,
                usdtAddress,
                ton: onChainTon,
                usdt: onChainUsdt,
                secret,
              };
              return result;
            } catch (e) {
              retry++;
              console.log(`${secret.id} ERROR: ${e?.message}`);
              await sleep(0.5);
            }
          }
          return null;
        })
      )
  );
  let accounts = data
    .filter((val) => val)
    .filter(({ ton, usdt }) => ton + usdt > 0)
    .sort((a, b) => {
      if (a.ton + b.ton > 0) {
        return b.ton - a.ton;
      } else {
        return b.usdt - a.usdt;
      }
    });
  console.log(`Found ${accounts.length} accounts: `);
  accounts.forEach(({ secret, ton, usdt, address }) =>
    console.log(
      ` >> ${secret.id} ${nonBounceableFmt(address)} TON=${ton} USDT=${usdt}`
    )
  );
  let holdingTonAccount,
    retryOutOfGas = 0;
  for (const { secret, address, usdtAddress } of accounts) {
    const nonBounceAddress = nonBounceableFmt(address);
    while (true) {
      try {
        let ton,
          usdt = await reqExec(() => getUsdt(usdtAddress.toString()));
        if (holdingTonAccount && holdingTonAccount.id != secret.id) {
          const holdingAddress = await holdingTonAccount.address();
          let holdingTon = await reqExec(() => getTon(holdingAddress));
          if (holdingTon > 0 && usdt > 0) {
            console.log(
              `${
                holdingTonAccount.id
              } Send all gas to address ${nonBounceAddress.toString()} (${
                secret.id
              })`
            );
            await sendAllTon(holdingTonAccount, nonBounceAddress);
            holdingTon = await reqExec(() => getTon(holdingAddress));
            ton = await reqExec(() => getTon(address));
            if (holdingTon > 0 || ton == 0) continue;
            console.log(
              `${
                holdingTonAccount.id
              } Send gas to address ${nonBounceAddress.toString()} (${
                secret.id
              }) SUCCESS`
            );
          }
        }
        ton = await reqExec(() => getTon(address));
        console.log(
          `${
            secret.id
          } TON=${ton} USDT=${usdt} (${nonBounceAddress.toString()})`
        );
        if (ton < MIN_TON && usdt > 0) {
          console.log(
            `${secret.id} Not enough gas, having ${ton} TON (${
              retryOutOfGas + 1
            })`
          );
          if (retryOutOfGas == MAX_RETRY) {
            return;
          }
          retryOutOfGas++;
          await sleep(10);
          continue;
        }
        if (retryOutOfGas > 0) {
          retryOutOfGas = 0;
          console.log("Reset gas counting");
        }
        if (usdt > 0) {
          const targetAddress = getTargetAddress(secret.id);
          console.log(
            `${secret.id} Sending ${usdt} USDT to address ${targetAddress}`
          );
          await sendAllUsdt(secret, Address.parse(targetAddress));
          usdt = await reqExec(() => getUsdt(usdtAddress.toString()));
          if (usdt > 0) continue;
          console.log(`${secret.id} Sending all USDT success`);
          ton = await reqExec(() => getTon(address));
        }
        if (ton > 0) {
          holdingTonAccount = secret;
        }
        break;
      } catch (e) {
        // console.error(e);
        console.log(`${secret.id} ERROR: ${e?.response?.data?.error || e?.message}`);
      }
    }
  }
};

main();
