import { Address } from "@ton/core";
import {
  getTon,
  getUsdt,
  getUsdtAddress,
  nonBounceableFmt,
  sendAllUsdt,
} from "../../utils/balance-ton.js";
import { randomInt, sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBananaAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(10);
const MIN_TON = 0.06;
const ONLY = [
];
const execMap = {};
const MIN_USDT_TO_WITHDRAW = 0.5;
const MAX_RETRY = 10;

const getTargetAddress = (id) => {
  let addressList = [];
  if (id.startsWith("duy")) {
    addressList = ["UQBfnvpvtL4MaXU3tLnvkAg21XWnI64r5N9XS0AF6IvVV7x9"];
  } else if (id.startsWith("atung")) {
    addressList = ["UQAv8yZRzBm0SrmO5oeTOABiaHsuWui7Yt6dudRp1D4u54fm"];
  } else if (id.startsWith("cucode")) {
    addressList = [
      "UQCLLVpzWJ6xzN_5zD6tAFJZzoUQL1aAX4ZE0VvhCUKiJVmY",
      "UQAv8yZRzBm0SrmO5oeTOABiaHsuWui7Yt6dudRp1D4u54fm",
    ];
  } else {
    addressList = [
      "UQDF87bpgA02s5a92yaog5r0x5-zePGMu00iMVDCxYLbzVPf", // main wallet
      "UQATyvVBtDZUk_sBQKo_w3WgQF7c2gcOy3xqMfJw7549MpIy", // wave wallet 1
      "UQBt2qAlCv_KyDNORZmhonoZJi8Ii95AQcl4yb5mM5P2Eau2", // wave wallet a
      "UQDPOu-jVfoJgi9JK8y7cmc4cQOryWo_dcCpF3galEivVt1s", // wave wallet b
      "UQDdCFdF0Qs19CwInqOxs7wLcuiVy1tODQC_seBikvlsdbEk", // wave wallet c
    ];
  }
  if (addressList.length <= 1) return addressList[0];
  return addressList[randomInt(1, addressList.length) - 1];
};

const addressExec = (address, fn = async () => {}) => {
  if (!(address in execMap)) {
    execMap[address] = newSemaphore().exec;
  }
  return execMap[address](fn);
};

const main = async () => {
  let secrets = await getAllBananaAddress();
  if (ONLY.length > 0) {
    secrets = secrets.filter((secret) => ONLY.includes(secret.id));
  }
  let data = await Promise.all(
    secrets.map((secret) =>
      exec(async () => {
        let retry = 0;
        while (retry < MAX_RETRY) {
          try {
            let addressV4 = (await secret.getWallet())?.address;
            if (!addressV4) return null;
            const usdtAddress = await reqExec(() => getUsdtAddress(addressV4));
            let usdt = await reqExec(() =>
              getUsdt(usdtAddress.toString(), addressV4)
            );
            let addressV5,
              usdtAddressV5,
              usdtV5 = 0;
            addressV5 = (await secret.getWalletV5())?.address;
            usdtAddressV5 = await reqExec(() => getUsdtAddress(addressV5));
            usdtV5 = await reqExec(() =>
              getUsdt(usdtAddressV5.toString(), addressV5)
            );
            const result = [
              {
                address: addressV4,
                usdtAddress: usdtAddress,
                usdt: usdt,
                secret,
                isV5: false,
              },
              {
                address: addressV5,
                usdtAddress: usdtAddressV5,
                usdt: usdtV5,
                secret,
                isV5: true,
                addressV4,
              },
            ];
            await sleep(0.5);
            return result;
          } catch (e) {
            retry++;
            secret.error(e);
            await sleep(randomInt(1, 2));
          }
        }
        return null;
      })
    )
  );
  console.log(`Fetched ${data.length}/${secrets.length} accounts data!`);
  let accounts = data
    .flat()
    .filter((val) => val)
    .filter(({ usdt }) => usdt >= MIN_USDT_TO_WITHDRAW)
    .sort((a, b) => {
      return b.usdt - a.usdt;
    });
  console.log(`Found ${accounts.length} accounts: `);
  accounts.forEach(({ secret, address, usdt, isV5 }) =>
    console.log(
      ` >> ${secret.id} USDT=${usdt} (${nonBounceableFmt(address)} - ${
        isV5 ? "V5" : "V4"
      })`
    )
  );
  await Promise.all(
    accounts.map(({ secret, address, usdtAddress, isV5 }) =>
      exec(async () => {
        const nonBounceAddress = nonBounceableFmt(address);
        const targetAddress = getTargetAddress(secret.id);
        if (targetAddress == nonBounceAddress) {
          secret.log(`Ignore address ${nonBounceAddress}`);
          return;
        }
        await addressExec(targetAddress, async () => {
          while (true) {
            try {
              const ton = await reqExec(() => getTon(address));
              const usdt = await reqExec(() =>
                getUsdt(usdtAddress.toString(), address)
              );
              if (ton < MIN_TON && usdt > 0) {
                secret.log(`Not enough gas, having ${ton} TON`);
                return;
              }
              secret.log(
                `TON=${ton} USDT=${usdt} (${nonBounceAddress.toString()})`
              );
              if (usdt > 0) {
                secret.log(`Sending ${usdt} USDT to address ${targetAddress}`);
                await reqExec(() =>
                  sendAllUsdt(secret, Address.parse(targetAddress), isV5)
                );
                // await reqExec(() =>
                //   sendUsdt(secret, Address.parse(targetAddress), 100)
                // );

                let newUsdtAmount = await reqExec(() =>
                  getUsdt(usdtAddress.toString(), address)
                );
                if (newUsdtAmount == usdt) {
                  secret.log(`ERROR: Sent fail, wait and try again`);
                  await sleep(5);
                  continue;
                }
                secret.log(`Sending all USDT success!`);
              }
              break;
            } catch (e) {
              secret.log(
                `ERROR: ${e?.response?.data?.error || e?.message || e}`
              );
              await sleep(randomInt(1, 2));
            }
          }
        });
      })
    )
  );
  console.log("======== Done all tasks ============");
};

main();
