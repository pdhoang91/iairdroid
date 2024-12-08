import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { chains } from "chain-registry";
import Web3 from "web3";
import { Address, JettonMaster, TonClient } from "@ton/ton";
import TonWeb from "tonweb";
import { newSemaphore } from "../utils/semaphore.js";
import { LocalStorage } from "node-localstorage";
import electron from "electron";
import path from "path";
import NodeCache from "node-cache";
import { isElectronApp } from "../utils/electron.js";

const suiRpcUrl = getFullnodeUrl("mainnet");
// const suiRpcUrl = "https://go.getblock.io/4d2eda8de9e6431ba800e305dcb15b23";
// https://go.getblock.io/f93d3a7e8ec64a1393dbc936479d422f
// https://go.getblock.io/2a74358089e444b58f1d283d195e92b8
export const seiRpcURL = "https://rpc.sei-apis.com";
export const bahamutRpcUrl = "https://rpc1.bahamut.io";
export const ethRpcUrl = "https://rpc.ankr.com/eth";

export const suiClient = new SuiClient({ url: suiRpcUrl });
export const seiClient = () => SigningCosmWasmClient.connect(seiRpcURL);
export const bahamutClient = new Web3(bahamutRpcUrl);
export const evmClient = new Web3(ethRpcUrl);
export const BINARY_LOCATION = isElectronApp ? path.join(electron.app.getPath("userData"), "/wave-bin") : "./bin";
export const SELENIUM_EXTENSION_PATH = isElectronApp ? path.join(electron.app.getPath("userData"), "/selenium-extensions") : path.resolve("./selenium-extensions");
export const SELENIUM_CACHE_PATH = isElectronApp ? path.join(electron.app.getPath("userData"), "/selenium-cache") : path.resolve("./selenium-cache");
export const SELENIUM_SNAPSHOT_PATH = isElectronApp ? path.join(electron.app.getPath("userData"), "/selenium-snapshot") : path.resolve("./selenium-snapshot");
const storageCache = new NodeCache({forceString: false, checkperiod: 60, useClones: false, stdTTL: 12 * 60 * 60});
export const getLocalStorage = (() => {
  let storage;
  return () => {
    if (storage) return storage;
    const location = process.versions.hasOwnProperty('electron') ? path.join(electron.app.getPath("userData"), "/wave-storage") : "./storage";
    console.log(`Init storage at location ${location}`);
    storage = new LocalStorage(location, Number.MAX_VALUE)
    return storage;
  }
})()

export const storageEntries = (prefix = "") => {
  const storage = getLocalStorage();
  const result = {}
  for(let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key.startsWith(prefix)) continue
    const value = getItemObj(key)
    result[key] = value;
  }
  return result;
}

export const setItem = (key, value, expireTime = 24 * 60 * 60_000) => {
  if (value === undefined || value === null) return
  const storage = getLocalStorage();
  storageCache.set(key, value, expireTime / 1000);
  return storage.setItem(key, JSON.stringify({
    data: JSON.stringify(value),
    expireAt: new Date().getTime() + expireTime,
  }));
}

export const getItem = (key) => {
  let obj = getLocalStorage().getItem(key);
  if (obj) {
    try {
      const { data, expireAt } = JSON.parse(obj);
      if (new Date() >= expireAt) {
        removeItem(key)
        return null
      }
      return { data, expireAt };
    } catch (e) {
      removeItem(key)
      console.error(e)
    }
  }
  return null;
}

export const getItemObj = (key) => {
  if (storageCache.has(key)) {
    return storageCache.get(key);
  }
  const item = getItem(key)

  if (item) {
    const {data, expireAt} = item;
    const result = JSON.parse(data);
    storageCache.set(key, result, (expireAt - new Date().getTime()) / 1000);
    return result;
  }
  return null
}

export const removeItem = (key) => {
  storageCache.del(key)
  getLocalStorage().removeItem(key);
}

let tonEndpoint,
  tonClient = new TonClient({ endpoint: tonEndpoint }),
  tonweb = new TonWeb(new TonWeb.HttpProvider(tonEndpoint)),
  jettonUSDTMaster = tonClient.open(
    JettonMaster.create(
      Address.parse("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs")
    )
  ),
  jettonDOGSMaster = tonClient.open(
    JettonMaster.create(
      Address.parse("EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS")
    )
  ),
  jettonHMSTRMaster = tonClient.open(
    JettonMaster.create(
      Address.parse("EQAJ8uWd7EBqsmpSWaRdf_I-8R8-XHwh3gsNKhy-UrdrPcUo")
    )
  ),
  initTon = false,
  { exec: initExec } = newSemaphore(1);
export const ton = async () => {
  await initExec(async () => {
    if (!initTon) {
      console.log("Init TON network dependency");
      // tonEndpoint = await getHttpEndpoint();
      // tonEndpoint = "https://go.getblock.io/a31b72e299aa4334a5e5bbd46cb514ad/jsonRPC";
      tonEndpoint = "https://go.getblock.io/c8fc0a7ae40f4bbdb325fe1a5690f720/jsonRPC"; // 1479 rpc
      // tonEndpoint = "https://go.getblock.io/a9d223044eab4264881d20ac4fc5b835/jsonRPC"; // duy rpc 1
      console.log(`Found ton endpoint: ${tonEndpoint}`)
      tonClient = new TonClient({ endpoint: tonEndpoint });
      tonweb = new TonWeb(new TonWeb.HttpProvider(tonEndpoint));
      jettonUSDTMaster = tonClient.open(
        JettonMaster.create(
          Address.parse("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs")
        )
      );
      jettonDOGSMaster = tonClient.open(
        JettonMaster.create(
          Address.parse("EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS")
        )
      );
      jettonHMSTRMaster = tonClient.open(
        JettonMaster.create(
          Address.parse("EQAJ8uWd7EBqsmpSWaRdf_I-8R8-XHwh3gsNKhy-UrdrPcUo")
        )
      );
      initTon = true;
    }
  });
  return {
    tonClient,
    tonweb,
    jettonUSDTMaster,
    jettonDOGSMaster,
    jettonHMSTRMaster,
  };
};

export const SUI_COINTYPE = "0x2::sui::SUI";
export const OCEAN_COINTYPE =
  "0xa8816d3a6e3136e86bc2873b1f94a15cadc8af2703c075f2d546c2ae367f4df9::ocean::OCEAN";
export const EVENT_TYPE_UPGRADE_LEVEL =
  "0x1efaf509c9b7e986ee724596f526a22b474b15c376136772c00b8452f204d2d1::game::UpgradeLevel";
export const EVENT_TYPE_CREATE_USER =
  "0x1efaf509c9b7e986ee724596f526a22b474b15c376136772c00b8452f204d2d1::game::CreateUser";
export const GAME_SHARE_OBJECT_ID =
  "0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a";
export const GAME_FIRST_TX_OBJECT_TYPE =
  "0x2::coin::Coin<0xa8816d3a6e3136e86bc2873b1f94a15cadc8af2703c075f2d546c2ae367f4df9::ocean::OCEAN>";
export const CLOCK_SHARE_OBJECT_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000006";
export const WAVE_WALLET_PACKAGE =
  "0x2c68443db9e8c813b194010c11040a3ce59f47e4eb97a2ec805371505dad7459";
export const CREDIT_ADDRESS =
  "0x9cf20f24d4a841a04f5bf5b07f177db952a3e8d0ec619c01ab18e2f0db984667";

export const MANA_CONTRACT_ADDRESS =
  "sei1usww9g7zd3yt3n3d525457yzjw2jxh5s38ad43894zkfl83cgnksz7fnce";

export const SPELL_FARMING_CONTRACT_ADDRESS =
  "sei16hnx5ydtummvs2h2dax2jwkx6deaagsyl34vsy5wy9ltcqw4xvpscmrqep";

export const SPELL_FARMING_V2_CONTRACT_ADDRESS =
  "sei1mnpqq8dc078wntnp7cls3za9hkwghq3xztgpam2hxh22wrd4w0as5ck6tr";

export const getSeiChain = () =>
  chains.find(({ chain_name }) => chain_name === "sei");

export const DZOOK_CONTRACT_ADDRESS =
  "0xda879470d70845Da9efbD4884C8149a6Df4e50A1";
export const VIVA_CONTRACT_ADDRESS =
  "0xf93D24c03344B5e697ad83D59cAa1c5817973365";

export const TON_BIGET_WALLET = "bitgetTonWallet";
export const TON_TG_WALLET = "telegram-wallet";