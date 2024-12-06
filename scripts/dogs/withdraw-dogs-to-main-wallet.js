import { Address } from "@ton/core";
import {
  getDogs,
  getDogsAddress,
  getTon,
  nonBounceableFmt,
  sendAllDogs,
  sendDogs,
} from "../../utils/balance-ton.js";
import { randomInt, sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllDogsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(5);
const MIN_TON = 0.09;
const RANGE = [0, 10];
const execMap = {};
const getTargetAddress = (id) => {
  let addressList = [];
  if (id.startsWith("duy")) {
    addressList = ["UQCLLVpzWJ6xzN_5zD6tAFJZzoUQL1aAX4ZE0VvhCUKiJVmY"];
  } else if (id.startsWith("atung")) {
    addressList = ["UQAv8yZRzBm0SrmO5oeTOABiaHsuWui7Yt6dudRp1D4u54fm"];
  } else {
    addressList = [
      "UQDF87bpgA02s5a92yaog5r0x5-zePGMu00iMVDCxYLbzVPf", // main wallet
      // "UQAOB-IY46nRFs8n60zB8eTCewqp4tBpv_v5GE_Eo5DyPSQ5", // partner wallet
      // "UQATyvVBtDZUk_sBQKo_w3WgQF7c2gcOy3xqMfJw7549MpIy", // wave wallet 1
      // "UQBt2qAlCv_KyDNORZmhonoZJi8Ii95AQcl4yb5mM5P2Eau2", // wave wallet a
    ];
  }
  if (addressList.length <= 1) return addressList[0];
  return addressList[randomInt(1, addressList.length) - 1];
};

const addressExec = (address, fn = async () => { }) => {
  if (!(address in execMap)) {
    execMap[address] = newSemaphore().exec;
  }
  return execMap[address](fn);
};

const main = async () => {
  const [start, end] = RANGE;
  const secrets = await getAllDogsAddress();
  let data = await Promise.all(
    secrets
      .filter((secret, i) => i >= start && i <= end)
      .map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < 3) {
            try {
              let addressV4 = (await secret.getWallet())?.address;
              if (!addressV4) return null;
              const dogsAddress = await reqExec(() => secret.getDOGSAddress());
              // let ton = await reqExec(() => getTon(onChainAddress));
              let dogs = await reqExec(() => getDogs(dogsAddress.toString()));
              let addressV5 = (await secret.getWalletV5())?.address;
              const dogsAddressV5 = await reqExec(() => getDogsAddress(addressV5));
              // let tonV5 = await reqExec(() => getTon(addressV5));
              let dogsV5 = await reqExec(() => getDogs(dogsAddressV5.toString()));
              const result = [{
                address: addressV4,
                dogsAddress,
                dogs,
                secret,
                isV5: false,
              }, {
                address: addressV5,
                dogsAddress: dogsAddressV5,
                dogs: dogsV5,
                secret,
                isV5: true,
                addressV4,
              }];
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
    .flat()
    .filter((val) => val)
    .filter(({ dogs }) => dogs > 0)
    .sort((a, b) => {
      return b.dogs - a.dogs;
    });
  console.log(`Found ${accounts.length} accounts: `);
  accounts.forEach(({ secret, address, dogs, isV5 }) =>
    console.log(` >> ${secret.id} DOGS=${dogs} (${nonBounceableFmt(address)} - ${isV5 ? "V5":"V4"})`)
  );
  await Promise.all(
    accounts.map(({ secret, address, dogsAddress, dogs, isV5 }) =>
      exec(async () => {
        const nonBounceAddress = nonBounceableFmt(address);
        while (true) {
          try {
            if (isV5) {
              secret.log("Not support withdraw Jetton from wallet v5");
              return
            }
            const ton = await reqExec(() => getTon(address))
            if (ton < MIN_TON && dogs > 0) {
              secret.log(`Not enough gas, having ${ton} TON`);
              return;
            }
            secret.log(
              `TON=${ton} DOGS=${dogs} (${nonBounceAddress.toString()})`
            );
            if (dogs > 0) {
              const targetAddress = getTargetAddress(secret.id);
              if (targetAddress == nonBounceAddress) {
                secret.log(`Ignore address ${nonBounceAddress}`);
                break;
              }
              await addressExec(targetAddress, async () => {
                secret.log(`Sending ${dogs} DOGS to address ${targetAddress}`);
                await reqExec(() =>
                  sendAllDogs(secret, Address.parse(targetAddress))
                );
                // await reqExec(() =>
                //   sendDogs(secret, Address.parse(targetAddress), 100)
                // );
              });
              let newDogsAmount = await reqExec(() =>
                getDogs(dogsAddress.toString())
              );
              if (newDogsAmount == dogs) {
                secret.log(`ERROR: Sent fail, wait and try again`);
                await sleep(5);
                continue;
              }
              secret.log(`Sending all DOGS success!`);
            }
            break;
          } catch (e) {
            secret.log(`ERROR: ${e?.response?.data?.error || e?.message}`);
          }
        }
      })
    )
  );
  console.log("======== Done all tasks ============")
};

main();
