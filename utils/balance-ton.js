import {
  Address,
  Cell,
  SendMode,
  beginCell,
  fromNano,
  internal,
  loadStateInit,
  storeStateInit,
  toNano,
} from "@ton/core";
import { getItemObj, removeItem, setItem, ton } from "../config/network.js";
import TonWeb from "tonweb";
import { sleep, toFixedRoundDown } from "./helper.js";
import {
  JettonWallet,
  WalletContractV3R1,
  WalletContractV3R2,
  WalletContractV4,
  WalletContractV5Beta,
  WalletContractV5R1,
} from "@ton/ton";
import axios from "axios";
import { newSemaphore } from "./semaphore.js";
import { sha256_sync } from "@ton/crypto";
import nacl from "tweetnacl";

const TIMEOUT = 1.5 * 60 * 1000; // 1.5 mins
const MONTH = 30 * 24 * 60 * 60_000;
const httpClient = axios.create();

export const getTon = async (address) => {
  const { tonClient } = await ton();
  const balance = await tonClient.getBalance(address);
  return parseFloat(fromNano(balance));
};

export const nonBounceableFmt = (address) =>
  address.toString({ bounceable: false });

const usdtAddressKey = (address) => `ton_usdt_${nonBounceableFmt(address)}`;
export const getUsdtAddress = async (address) => {
  let usdtAddress = getItemObj(usdtAddressKey(address));
  if (usdtAddress) return Address.parse(usdtAddress);
  const { jettonUSDTMaster } = await ton();
  usdtAddress = await jettonUSDTMaster.getWalletAddress(address);
  setItem(usdtAddressKey(address), nonBounceableFmt(usdtAddress), MONTH);
  return usdtAddress;
};

export const getUsdt = async (address) => {
  const balance = await getJettonBalance(address);
  return balance / 1_000_000;
};

const dogsAddressKey = (address) => `ton_dogs_${nonBounceableFmt(address)}`;
export const getDogsAddress = async (address) => {
  let dogAddress = getItemObj(dogsAddressKey(address));
  if (dogAddress) return Address.parse(dogAddress);
  const { jettonDOGSMaster } = await ton();
  dogAddress = await jettonDOGSMaster.getWalletAddress(address);
  setItem(dogsAddressKey(address), nonBounceableFmt(dogAddress), MONTH);
  return dogAddress;
};

// export const getDogsAddress = async (address) => {
//   const { jettonDOGSMaster, tonClient } = await ton();
//   await dogWalletCodeExec(async() => {
//     if (!dogWalletCode) {
//       console.log("Getting DOGS master code")
//       let state = await tonClient.getContractState(jettonDOGSMaster.address)

//       dogWalletCode = Cell.fromBoc(state.code)[0];
//       console.log("Getting DOGS master code SUCCESS!");
//     }
//   })
//   const jettonWalletStateInit = beginCell()
//     .store(
//       storeStateInit({
//         code: dogWalletCode,
//         data: beginCell()
//           .storeUint(0, 2)
//           .storeMaybeRef(dogWalletCode)
//           .storeMaybeRef(
//             beginCell()
//             .storeUint(0, 4)
//             .storeCoins(0)
//             .storeAddress(address)
//             .storeAddress(jettonDOGSMaster.address)
//           )
//           .storeUint(0, 1)
//           .endCell()
//       })
//     )
//     .endCell();

//   const jettonWalletAddress = beginCell()
//       .storeUint(4, 3)
//       .storeInt(0, 8)
//       .storeUint(BigInt("0x" + jettonWalletStateInit.hash().toString("hex")), 256)
//       .endCell()
//   const userJettonWalletAddress = new Address(0, jettonWalletAddress.hash());

//   return userJettonWalletAddress;
// };

export const getDogs = async (address) => {
  const balance = await getJettonBalance(address);
  return balance / 1_000_000_000;
};

const hmstrAddressKey = (address) => `ton_hmstr_${nonBounceableFmt(address)}`;
export const getHmstrAddress = async (address) => {
  let hmstrAddress = getItemObj(hmstrAddressKey(address));
  if (hmstrAddress) return Address.parse(hmstrAddress);
  const { jettonHMSTRMaster } = await ton();
  hmstrAddress = await jettonHMSTRMaster.getWalletAddress(address);
  setItem(hmstrAddressKey(address), nonBounceableFmt(hmstrAddress), MONTH);
  return hmstrAddress;
};

export const getHmstr = async (address, ownerAddress) => {
  const contractDeployed = await isContractDeployed(Address.parse(address));
  if (contractDeployed) {
    const balance = await getJettonBalance(address);
    return balance / 1_000_000_000;
  } else {
    const proof = await getHamsterProof(nonBounceableFmt(ownerAddress));
    if (proof) {
      return proof.compressed_info.amount / 1_000_000_000;
    }
  }
  return 0;
};

export const getJettonBalance = async (address) => {
  const { tonweb } = await ton();
  try {
    const jettonWallet = new TonWeb.token.jetton.JettonWallet(tonweb.provider, {
      address,
    });
    const { balance } = await jettonWallet.getData();
    return balance;
  } catch (e) {
    if (e?.result?.exit_code == -13) return 0;
    if (e?.result)
      throw new Error(
        `exit_code=${e?.result?.exit_code}, stack=${JSON.stringify(
          e?.result?.stack
        )}`
      );
    throw e;
  }
};

export const sendAllTon = async (secret, dest) => {
  const address = await secret.address();
  const amount = await getTon(address);
  return sendTonTx(secret, dest, amount, await secret.getWallet(), true);
};

export const sendTon = async (secret, dest, amount) => {
  return sendTonTx(secret, dest, amount, await secret.getWallet(), false);
};

export const sendTonV5 = async (secret, dest, amount) => {
  return sendTonTx(secret, dest, amount, await secret.getWalletV5(), false);
};

export const sendAllTonV5 = async (secret, dest) => {
  const address = await secret.address();
  const amount = await getTon(address);
  return sendTonTx(secret, dest, amount, await secret.getWalletV5(), true);
};

const sendTonTx = async (secret, dest, amount, wallet, sendAll = false) => {
  const { tonClient } = await ton();
  // const wallet = await secret.getWallet();
  const keyPair = await secret.getKeyPair();
  const contract = tonClient.open(wallet);
  let seqno = await contract.getSeqno();

  const [lastTx] = await tonClient.getTransactions(wallet.address, {
    limit: 1,
  });
  const lastTxHash = lastTx?.hash()?.toString("hex");
  const msg = {
    secretKey: keyPair.secretKey,
    seqno,
    messages: [
      internal({
        value: toNano(amount),
        to: dest,
        bounce: false,
      }),
    ],
    init: wallet.init,
  };
  if (sendAll) {
    msg.sendMode = SendMode.CARRY_ALL_REMAINING_BALANCE;
  }
  let transfer = await contract.createTransfer(msg);

  // console.log(">>" + lastTxHash)
  await contract.send(transfer);
  let confirmation = 0,
    isTimeout = false;
  setTimeout(() => (isTimeout = true), TIMEOUT);
  while (confirmation < 2) {
    if (isTimeout) throw new Error("timeout");
    try {
      const [newTx] = await tonClient.getTransactions(wallet.address, {
        limit: 1,
      });
      const newTxHash = newTx?.raw?.hash()?.toString("hex");
      // console.log(newTxHash)
      if (newTxHash != lastTxHash) {
        confirmation++;
      }
    } catch (e) {
      console.error(`${secret.id} ERROR: ${e?.message}`);
    } finally {
      await sleep(5);
    }
  }
};

export const sendAllUsdt = async (secret, dest, isV5 = false) => {
  const address = isV5
    ? (await secret?.getWalletV5())?.address
    : (await secret?.getWallet())?.address;
  const usdtAddress = await getUsdtAddress(address);
  const amount = await getUsdt(usdtAddress.toString());
  if (amount == 0) {
    secret.log(`USDT=0, nothing to do`);
    return;
  }
  return sendJettonTxV5(
    secret,
    dest,
    usdtAddress,
    toNano(`${toFixedRoundDown(amount / 1000, 8)}`),
    false,
    isV5
  );
};

export const sendUsdt = async (secret, dest, amount, isV5 = false) => {
  const address = isV5
    ? (await secret?.getWalletV5())?.address
    : (await secret?.getWallet())?.address;
  const usdtAddress = await getUsdtAddress(address);
  return sendJettonTxV5(
    secret,
    dest,
    usdtAddress,
    toNano(`${toFixedRoundDown(amount / 1000, 8)}`),
    false,
    isV5
  );
};

export const sendAllDogs = async (secret, dest, isV5 = false) => {
  const address = isV5
    ? (await secret?.getWalletV5())?.address
    : (await secret?.getWallet())?.address;
  const dogsAddress = await getDogsAddress(address);
  const amount = await getDogs(dogsAddress.toString());
  if (amount == 0) {
    secret.log(`DOGS=0, nothing to do`);
    return;
  }

  return sendJettonTxV5(secret, dest, dogsAddress, toNano(amount), true, isV5);
};

export const sendDogs = async (secret, dest, amount, isV5 = false) => {
  const address = isV5
    ? (await secret?.getWalletV5())?.address
    : (await secret?.getWallet())?.address;
  const dogsAddress = await getDogsAddress(address);
  return sendJettonTxV5(secret, dest, dogsAddress, toNano(amount), false, isV5);
};

export const sendAllHmstr = async (secret, dest, isV5 = false) => {
  const address = isV5
    ? (await secret?.getWalletV5())?.address
    : (await secret?.getWallet())?.address;
  const hmstrAddress = await getHmstrAddress(address);
  const amount = await getHmstr(hmstrAddress.toString(), address);
  if (amount <= 0.1) {
    secret.log(`HMSTR=0, nothing to do`);
    return;
  }
  const deployed = await isContractDeployed(hmstrAddress);
  if (!deployed) {
    const proof = await getHamsterProof(nonBounceableFmt(address));
    if (!proof)
      throw new Error(
        `not found proof for address ${nonBounceableFmt(address)}`
      );
    return await sendMintlessJettonTx(
      secret,
      dest,
      hmstrAddress,
      toNano(amount),
      proof.custom_payload,
      proof.state_init,
      isV5,
      true
    );
  }

  return await sendJettonTxV5(
    secret,
    dest,
    hmstrAddress,
    toNano(amount),
    true,
    isV5
  );
};

export const sendHmstr = async (secret, dest, amount, isV5 = false) => {
  const address = isV5
    ? (await secret?.getWalletV5())?.address
    : (await secret?.getWallet())?.address;
  const hmstrAddress = await getHmstrAddress(address);
  const deployed = await isContractDeployed(hmstrAddress);
  if (!deployed) {
    const proof = await getHamsterProof(nonBounceableFmt(address));
    if (!proof)
      throw new Error(
        `not found proof for address ${nonBounceableFmt(address)}`
      );
    return await sendMintlessJettonTx(
      secret,
      dest,
      hmstrAddress,
      toNano(amount),
      proof.custom_payload,
      proof.state_init,
      isV5,
      false
    );
  }

  return await sendJettonTxV5(
    secret,
    dest,
    hmstrAddress,
    toNano(amount),
    false,
    isV5
  );
};

/**
 * @deprecated
 * use sendJettonTxV5
 */
const sendJettonTx = async (
  secret,
  dest,
  jettonAddress,
  jettonAmount,
  sendAll = false
) => {
  const { tonweb, tonClient } = await ton();
  // console.log(TonWeb.utils.toNano(`${amount}`))
  const keyPair = await secret.getKeyPair();
  const v4Wallet = new tonweb.wallet.all["v4R2"](tonweb.provider, {
    publicKey: keyPair.publicKey,
  });
  const toV4Wallet = new tonweb.wallet.all["v4R2"](tonweb.provider, {
    address: dest.toString(),
  });
  const jettonWallet = new TonWeb.token.jetton.JettonWallet(tonweb.provider, {
    address: jettonAddress.toString(),
  });
  const seqno = (await v4Wallet.methods.seqno().call()) || 0;
  const [lastTx] = await tonClient.getTransactions(
    Address.parse(v4Wallet.address.toString()),
    { limit: 1 }
  );
  const lastTxHash = lastTx?.hash()?.toString("hex");
  const result = await v4Wallet.methods
    .transfer({
      secretKey: keyPair.secretKey,
      toAddress: jettonWallet.address,
      amount: TonWeb.utils.toNano("0.05"),
      seqno,
      payload: await jettonWallet.createTransferBody({
        jettonAmount, // Jetton amount (in basic indivisible units)
        toAddress: await toV4Wallet.getAddress(), // recepient user's wallet address (not Jetton wallet)
        forwardAmount: TonWeb.utils.toNano("0.01"), // some amount of TONs to invoke Transfer notification message
        // forwardPayload: null, // text comment for Transfer notification message
        responseAddress: await v4Wallet.getAddress(), // return the TONs after deducting commissions back to the sender's wallet address
      }),
      sendMode: 3,
    })
    .send();
  // console.log(result)
  let confirmation = 0;
  // console.log(">>" + lastTxHash)
  let firstTxHash,
    isTimeout = false;
  setTimeout(() => (isTimeout = true), TIMEOUT);
  while (confirmation < 5) {
    if (isTimeout) {
      throw new Error("timeout");
    }
    try {
      const [newTx] = await tonClient.getTransactions(
        Address.parse(v4Wallet.address.toString()),
        { limit: 1 }
      );
      const newTxHash = newTx?.raw?.hash()?.toString("hex");
      // console.log(firstTxHash || newTxHash)
      if ((firstTxHash || newTxHash) != lastTxHash) {
        if (!firstTxHash) {
          firstTxHash = newTxHash;
        } else {
          confirmation++;
        }
      }
    } catch (e) {
      console.error(e?.message);
    } finally {
      await sleep(5);
    }
  }
  return result;
};

const getTonkeeperQueryId = () => {
  return beginCell()
    .storeUint(0x546de4ef, 32) //crc32("tonkeeper")
    .storeBuffer(Buffer.from(nacl.randomBytes(4))) //random 32 bits
    .asSlice()
    .loadIntBig(64);
};

const sendJettonTxV5 = async (
  secret,
  dest,
  jettonAddress,
  jettonAmount,
  sendAll = false,
  isV5 = true
) => {
  const { tonClient } = await ton();
  const keyPair = await secret.getKeyPair();
  let senderWallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
  if (isV5) {
    senderWallet = WalletContractV5R1.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
    });
  }
  const jettonWallet = JettonWallet.create(jettonAddress);
  const contract = tonClient.open(senderWallet);
  let seqno = await contract.getSeqno();
  const [lastTx] = await tonClient.getTransactions(senderWallet.address, {
    limit: 1,
  });
  const lastTxHash = lastTx?.hash()?.toString("hex");

  const messageBody = beginCell()
    .storeUint(0x0f8a7ea5, 32) // opcode for jetton transfer
    .storeUint(getTonkeeperQueryId(), 64) // query id
    .storeCoins(jettonAmount) // jetton amount, amount * 10^9
    .storeAddress(dest)
    .storeAddress(senderWallet.address) // response destination
    .storeMaybeRef(null) // no custom payload
    .storeCoins(BigInt(1)) // forward amount - if >0, will send notification message
    .storeMaybeRef(null) // we store forwardPayload as a reference
    .endCell();
  const msg = {
    secretKey: keyPair.secretKey,
    seqno,
    messages: [
      internal({
        to: jettonWallet.address,
        value: toNano(0.05),
        bounce: true,
        body: messageBody,
      }),
    ],
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
  };
  const transfer = senderWallet.createTransfer(msg);
  await contract.send(transfer);
  let confirmation = 0;
  // console.log(">>" + lastTxHash)
  let firstTxHash,
    isTimeout = false;
  setTimeout(() => (isTimeout = true), TIMEOUT);
  while (confirmation < 5) {
    if (isTimeout) {
      throw new Error("timeout");
    }
    try {
      const [newTx] = await tonClient.getTransactions(senderWallet.address, {
        limit: 1,
      });
      const newTxHash = newTx?.raw?.hash()?.toString("hex");
      // console.log(firstTxHash || newTxHash)
      if ((firstTxHash || newTxHash) != lastTxHash) {
        if (!firstTxHash) {
          firstTxHash = newTxHash;
        } else {
          confirmation++;
        }
      }
    } catch (e) {
      console.error(e?.message);
    } finally {
      await sleep(5);
    }
  }
};

const sendMintlessJettonTx = async (
  secret,
  dest,
  jettonAddress,
  jettonAmount,
  customPayload,
  stateInit,
  isV5 = false,
  sendAll = false
) => {
  const { tonClient } = await ton();
  const keyPair = await secret.getKeyPair();
  let senderWallet;
  senderWallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
  if (isV5) {
    senderWallet = WalletContractV5R1.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
    });
  }
  secret.log(
    `Claim hamster airdrop for address ${nonBounceableFmt(
      senderWallet.address
    )} (jetton = ${nonBounceableFmt(dest)})`
  );
  const jettonWallet = JettonWallet.create(jettonAddress);
  const contract = tonClient.open(senderWallet);
  let seqno = await contract.getSeqno();
  const [lastTx] = await tonClient.getTransactions(senderWallet.address, {
    limit: 1,
  });
  const lastTxHash = lastTx?.hash()?.toString("hex");

  const customPayloadCell = Cell.fromBase64(customPayload);
  // console.log(customPayloadCell.toBoc().toString("base64"))
  const sendMoneyBody = beginCell()
    // .storeUint(0x0df602d6, 32) // opcode for airdrop claim
    // .storeRef(claimAirdropBody)
    .storeUint(0x0f8a7ea5, 32) // opcode for jetton transfer
    .storeUint(0, 64) // query id
    .storeCoins(jettonAmount) // jetton amount, amount * 10^9
    .storeAddress(dest)
    .storeAddress(senderWallet.address) // response destination
    .storeMaybeRef(customPayloadCell)
    .storeCoins(toNano("0.01")) // forward amount - if >0, will send notification message
    .storeBit(false) // we store forwardPayload as a reference
    .endCell();
  // console.log(sendMoneyBody.toBoc().toString("base64"))
  const stateInitObj = loadStateInit(Cell.fromBase64(stateInit).asSlice());
  // console.log(stateInitObj.code.toBoc().toString("hex"))
  // console.log(stateInitObj.data.toBoc().toString("hex"))
  // console.log(sendMoneyBody)
  const msg = {
    secretKey: keyPair.secretKey,
    seqno,
    messages: [
      internal({
        to: jettonWallet.address,
        value: toNano("0.07"),
        // bounce: true,
        body: sendMoneyBody,
        init: stateInitObj,
      }),
    ],
    sendMode: SendMode.PAY_GAS_SEPARATELY,
    init: senderWallet.init,
  };
  const transfer = senderWallet.createTransfer(msg);
  await contract.send(transfer);
  removeItem(isContractDeployedKey(jettonAddress));
  let confirmation = 0;
  // console.log(">>" + lastTxHash)
  let firstTxHash,
    isTimeout = false;
  setTimeout(() => (isTimeout = true), TIMEOUT);
  while (confirmation < 5) {
    if (isTimeout) {
      throw new Error("timeout");
    }
    try {
      const [newTx] = await tonClient.getTransactions(senderWallet.address, {
        limit: 1,
      });
      const newTxHash = newTx?.raw?.hash()?.toString("hex");
      // console.log(firstTxHash || newTxHash)
      if ((firstTxHash || newTxHash) != lastTxHash) {
        if (!firstTxHash) {
          firstTxHash = newTxHash;
        } else {
          confirmation++;
        }
      }
    } catch (e) {
      console.error(e?.message);
    } finally {
      await sleep(5);
    }
  }
};

export const getTonInUsdtContract = async (address) => {
  const { tonClient } = await ton();
  const balance = await tonClient.getBalance(address);
  return fromNano(balance);
};

const isContractDeployedKey = (address) =>
  `ton_contract_deployed_${nonBounceableFmt(address)}`;
export const isContractDeployed = async (address) => {
  let data = getItemObj(isContractDeployedKey(address));
  if (data) return data.deployed;
  const { tonClient } = await ton();
  const state = await tonClient.getContractState(address);
  const deployed = state.state != "uninitialized";
  setItem(isContractDeployedKey(address), { deployed }, MONTH);
  return deployed;
};

// {
//   "owner": "0:0e07e218e3a9d116cf27eb4cc1f1e4c27b0aa9e2d069bffbf9184fc4a390f23d",
//   "jetton_wallet": "0:08db1d2d60cecdf884c5f73990702c696b048fcbcb7d47fe0cbaad0f18517b3d",
//   "custom_payload": "te6ccgECMwEABGoAAQgN9gLWAQlGA0I0rXIU3k/T5YpIO61lji2qYaoATvD6VByERzLig6MRAB4CIgWBcAIDBCIBIAUGKEgBAcIMRlHGnrpvTT66fLjpTmtZBobfDAkqpOnhamrcwA44AB0iASAHCChIAQHu0h9XcUyOdXiieUpNhLvU+QkK3OZhIebPrsObEB0tGwAcIgEgCQooSAEBRRb2TYrfc+fFIkHZlKtfx/PNOEVE9E7K+6cxp4zCDpgAGiIBIAsMKEgBAf24vO/qWLtpYpESTatgDBB4IWaA8DUwott1Eezj5N7qABkoSAEBRV1GYt62U8S3G26RHQj55F/QnK/hxQAr6vVwmexWndwAGCIBIA0OKEgBAdGff4+Mm9BMXWGcIj2Jwuex1VBTCGlMDuLm+UFFO7SQABYiASAPEChIAQHzKyM9F1CB9kdGcpuiAE95xPDWWkLIgAmocM+Ms/bqKgAXIgEgERIiASATFChIAQHb5O/QGrNRYXyj94GfGwiXJRMZUKhFnO556mQQf2MxfgAUIgEgFRYoSAEB3QzSMAdxRoELTbQ63E4ZK39M+dMcx+OakNbrTuT4WQ4AEyIBIBcYKEgBAZPpEtNgmQJTBJDv9/pWnsVv20+XzOpDWVETl7+1qhL5ABIiASAZGihIAQFWH1cDzIMTXvqPCWzXapXHESZw3nJL35Fg9jpF6NY18QAQIgEgGxwoSAEBa9o3k/v3mx5R1GXlB7VICzMko4SaaD5tSRtr+Q05TDAADyIBIB0eKEgBAZKLmCUwk00Jcb+P/DrqcvJq2L32Vf49L0lASRPdP01uAA4oSAEBJr1IWO7boDF45TnwKSk2S2EWbD7S0ZppURoSKVwAc5YADSIBIB8gKEgBATgeJSUOvlMbbI8Zf6V3+Oaah9C022XqMZY8ImdKIkfJAAwiASAhIihIAQG20g2Iii6acozgQuqznFhDrclHU92xHmrJwyIT9knoKgALIgEgIyQoSAEBYKBYAiU3rUpgMZ3rGqxxi3yRFa7B3Cgb2b5WUxIfp+4ACSIBICUmKEgBAcBXekYvtgCyFvo0nO1o2nfFuCTP4Grc8wCzXLpp1uIyAAgiASAnKChIAQHYkp7N+fIAMONMAWFlN8zxRDdryQ3gdpzezVtgbjXrlQAGIgEgKSoiASArLChIAQEbwH5otbZb79OwOb6WdTi4w/KHcqPxOvdSMjRSNm+SsgAFIgEgLS4oSAEBXrGwxO1IB9qMZrKaxX1oNnELkz/pdVCO4Ct8Ms6k1pwABSIBIC8wKEgBAXRXk64kLcAj2rKgg9whjkCV1VsNWkSeFGyQhsPT5Ji7AAAoSAEBPadam3vJH0qDLcEm8jeyAcqvqcDQnt6qU8z/EMCxLxUAASIBIDEyAGG6BjjqdEWzyfrTMHx5MJ7Cqni0Gm/+/kYT8SjkPI9YDhdL5DfgAAGb1MKAAAGyYyyCKEgBAVX3fIykZCuP1eV7jIlTgP6etZka/qBdIvd5hTBppCUzAAA=",
//   "state_init": "te6ccgEBAwEAjwACATQBAghCAg8a09ika9KDMh3eY5GV+3JgLpsxsXJ/7MJeLtwQlm30AMoAgAHA/EMcdToi2eT9aZg+PJhPYVU8Wg03/38jCfiUch5HsAAny5Z3sQGqyalJZpF1/8j7xHz5cfCHeCw0qHL5St2s9QjStchTeT9Plikg7rWWOLaphqgBO8PpUHIRHMuKDoxEBA==",
//   "compressed_info": {
//     "amount": "3873305071096",
//     "start_from": "1727344800",
//     "expired_at": "1821952800"
//   }
// }
export const hamsterProofKey = (address) => `ton_hamster_proof_${address}`;
const { exec: hamsterProofExec } = newSemaphore(2);
export const getHamsterProof = async (address) =>
  await hamsterProofExec(async () => {
    const data = getItemObj(hamsterProofKey(address));
    if (data) return data.proof;
    try {
      const response = await httpClient.get(
        `https://proof.hamsterkombatgame.io/jettons/EQAJ8uWd7EBqsmpSWaRdf_I-8R8-XHwh3gsNKhy-UrdrPcUo/wallet/${address}`
      );

      setItem(hamsterProofKey(address), { proof: response.data }, MONTH);
      return response.data;
    } catch (e) {
      if (
        ["failed to parse account id", "account not found"].includes(
          e?.response?.data?.error
        )
      ) {
        setItem(hamsterProofKey(address), { proof: null }, MONTH);
        return null;
      }
      throw e;
    }
  });

export const generateTonProof = async (
  wallet,
  address,
  keyPair,
  url,
  payloadToSign = ""
) => {
  const {
    timestamp,
    bufferToSign,
    domainBuffer,
    payload,
    origin,
    messageBuffer,
  } = tonConnectProofPayload(
    parseInt((new Date().getTime() / 1000).toFixed(0)),
    url,
    Address.parse(address),
    payloadToSign
  );

  const signature = nacl.sign.detached(
    Buffer.from(sha256_sync(bufferToSign)),
    keyPair.secretKey
  );
  return {
    timestamp: timestamp, // 64-bit unix epoch time of the signing operation (seconds)
    domain: {
      lengthBytes: domainBuffer.byteLength, // AppDomain Length
      value: domainBuffer.toString("utf8"), // app domain name (as url part, without encoding)
    },
    signature: Buffer.from(signature).toString("base64"), // base64-encoded signature
    payload: payload, // payload from the request,
    stateInit: walletStateInitFromState(wallet), // state init for a wallet
  };
};

export const walletStateInitFromState = (wallet) => {
  // const contract = walletContractFromState(wallet);

  return beginCell()
    .store(storeStateInit(wallet.init))
    .endCell()
    .toBoc({ idx: false })
    .toString("base64");
};

export const walletContractFromState = (wallet) => {
  const publicKey = Buffer.from(wallet.publicKey, "hex");
  return walletContract(publicKey, wallet.version);
};

export const walletContract = (publicKey, version, network = -239) => {
  if (typeof publicKey === "string") {
    publicKey = Buffer.from(publicKey, "hex");
  }

  switch (version) {
    case 0: // V3R1
      return WalletContractV3R1.create({ workchain, publicKey });
    case 1:
      return WalletContractV3R2.create({ workchain, publicKey });
    case 2:
      throw new Error("Unsupported wallet contract version - v4R1");
    case 3:
      return WalletContractV4.create({ workchain, publicKey });
    case 4:
      return WalletContractV5Beta.create({
        walletId: {
          networkGlobalId: network,
        },
        publicKey,
      });
    case 5:
      return WalletContractV5R1.create({ workchain: workchain, publicKey });
  }
};

export const tonConnectProofPayload = (timestamp, origin, address, payload) => {
  const timestampBuffer = Buffer.allocUnsafe(8);
  timestampBuffer.writeBigInt64LE(BigInt(timestamp));

  const domainBuffer = Buffer.from(new URL(origin).host);

  const domainLengthBuffer = Buffer.allocUnsafe(4);
  domainLengthBuffer.writeInt32LE(domainBuffer.byteLength);

  const addressWorkchainBuffer = Buffer.allocUnsafe(4);
  addressWorkchainBuffer.writeInt32BE(address.workChain);

  const addressBuffer = Buffer.concat([addressWorkchainBuffer, address.hash]);

  const messageBuffer = Buffer.concat([
    Buffer.from("ton-proof-item-v2/", "utf8"),
    addressBuffer,
    domainLengthBuffer,
    domainBuffer,
    timestampBuffer,
    Buffer.from(payload),
  ]);

  const bufferToSign = Buffer.concat([
    Buffer.from("ffff", "hex"),
    Buffer.from("ton-connect", "utf8"),
    Buffer.from(sha256_sync(messageBuffer)),
  ]);

  return {
    timestamp,
    bufferToSign,
    domainBuffer,
    payload,
    origin,
    messageBuffer,
  };
};
