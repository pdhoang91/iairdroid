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
import { getAllTonAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(10);
const { exec: reqExec } = newSemaphore(10);
const MIN_TON = 0.08;
const RANGE = [0, 1000];
const execMap = {};
const MIN_DOG_TO_WITHDRAW = 500;
const MAX_RETRY = 10;
const getTargetAddress = (id) => {
  let addressList = [];
  if (id.startsWith("duy")) {
    addressList = ["UQCLLVpzWJ6xzN_5zD6tAFJZzoUQL1aAX4ZE0VvhCUKiJVmY"];
  } else if (id.startsWith("atung")) {
    addressList = ["UQAv8yZRzBm0SrmO5oeTOABiaHsuWui7Yt6dudRp1D4u54fm"];
  } else {
    addressList = [
      "UQDF87bpgA02s5a92yaog5r0x5-zePGMu00iMVDCxYLbzVPf", // main wallet
      "UQAOB-IY46nRFs8n60zB8eTCewqp4tBpv_v5GE_Eo5DyPSQ5", // partner wallet
      "UQATyvVBtDZUk_sBQKo_w3WgQF7c2gcOy3xqMfJw7549MpIy", // wave wallet 1
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
  const secrets = await getAllTonAddress();
  let data = await Promise.all(
    secrets
      .filter((secret, i) => i >= start && i <= end)
      .map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            try {
              let addressV4 = (await secret.getWallet())?.address;
              if (!addressV4) return null;
              const dogsAddress = await reqExec(() => secret.getDOGSAddress());
              let dogs = await reqExec(() => getDogs(dogsAddress.toString()));
              let addressV5, dogsAddressV5, dogsV5 = 0;
              addressV5 = (await secret.getWalletV5())?.address;
              dogsAddressV5 = await reqExec(() => getDogsAddress(addressV5));
              dogsV5 = await reqExec(() => getDogs(dogsAddressV5.toString()));
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
  console.log(`Fetched ${data.length}/${secrets.length} accounts data!`)
  let accounts = data
    .flat()
    .filter((val) => val)
    .filter(({ dogs }) => dogs >= MIN_DOG_TO_WITHDRAW)
    .sort((a, b) => {
      return b.dogs - a.dogs;
    });
  console.log(`Found ${accounts.length} accounts: `);
  accounts.forEach(({ secret, address, dogs, isV5 }) =>
    console.log(` >> ${secret.id} DOGS=${dogs} (${nonBounceableFmt(address)} - ${isV5 ? "V5" : "V4"})`)
  );
  await Promise.all(
    accounts.map(({ secret, address, dogsAddress, isV5 }) =>
      exec(async () => {
        const nonBounceAddress = nonBounceableFmt(address);
        const targetAddress = getTargetAddress(secret.id);
        if (targetAddress == nonBounceAddress) {
          secret.log(`Ignore address ${nonBounceAddress}`);
          return
        }
        await addressExec(targetAddress, async () => {
          while (true) {
            try {
              const ton = await reqExec(() => getTon(address))
              const dogs = await reqExec(() =>
                  getDogs(dogsAddress.toString())
                );
              if (ton < MIN_TON && dogs > 0) {
                secret.log(`Not enough gas, having ${ton} TON`);
                return;
              }
              secret.log(
                `TON=${ton} DOGS=${dogs} (${nonBounceAddress.toString()})`
              );
              if (dogs > 0) {
                secret.log(`Sending ${dogs} DOGS to address ${targetAddress}`);
                await reqExec(() =>
                  sendAllDogs(secret, Address.parse(targetAddress), isV5)
                );
                // await reqExec(() =>
                //   sendDogs(secret, Address.parse(targetAddress), 100)
                // );

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
              secret.log(`ERROR: ${e?.response?.data?.error || e?.message || e}`);
              await sleep(randomInt(1, 2));
            }
          }
        });
      })
    )
  );
  console.log("======== Done all tasks ============")
};

main();
