import { newSemaphore } from "../utils/semaphore.js";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { NearWallet } from "@okxweb3/coin-near";
import {
  DEFAULT_ED25519_DERIVATION_PATH,
  SuiWallet,
  tryDecodeSuiPrivateKey,
} from "@okxweb3/coin-sui";
import { restoreWallet } from "@sei-js/cosmjs/dist/esm/wallet/wallet.js";
import moment from "moment";
import { connect } from "near-api-js";
import { InMemoryKeyStore } from "near-api-js/lib/key_stores/in_memory_key_store.js";
import { KeyPair } from "near-api-js/lib/utils/key_pair.js";
import {
  bahamutClient,
  evmClient,
  getSeiChain,
  seiRpcURL,
} from "./network.js";
import { getOfflineSignerAmino } from "cosmjs-utils";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";
import { EthWallet } from "@okxweb3/coin-ethereum";
import { newSpellClientWithProxy } from "../utils/spell.js";
import {
  defaultHamsterClient,
  newHamsterClientWithProxy,
} from "../utils/hamster.js";
import {
  defaultMemefiClient,
  newMemefiClientWithProxy,
} from "../utils/memefi.js";
import {
  defaultSpinnerClient,
  newSpinnerClientWithProxy,
} from "../utils/spinner.js";
import { defaultProxyClient, newProxyClientWithProxy } from "../utils/proxy.js";
import { newPixelVerseClientWithProxy } from "../utils/pixelVerse.js";
import { newTimeFarmClientWithProxy } from "../utils/timefarm.js";
import { newYesCoinClientWithProxy } from "../utils/yescoin.js";
import { newDJDogClientWithProxy } from "../utils/djdog.js";

import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV4, WalletContractV5R1 } from "@ton/ton";
import {
  defaultMemeClient,
  newMemeClientWithProxy,
} from "../utils/memeland.js";
import { newTomarketClientWithProxy } from "../utils/tomarket.js";
import { newLostDogClientWithProxy } from "../utils/lost-dog.js";
import { newDuckChainClientWithProxy } from "../utils/duckchain.js";
import { newMemelandTgClientWithProxy } from "../utils/memelandtg.js";
import { getWallet, newDogsClientWithProxy } from "../utils/dogs.js";
import { newBlumClientWithProxy } from "../utils/blum.js";
import {
  getDogsAddress,
  getUsdtAddress,
  nonBounceableFmt,
} from "../utils/balance-ton.js";
import { newMajorClientWithProxy } from "../utils/major.js";
import { newCatsClientWithProxy } from "../utils/cats.js";
import { newOceanClientWithProxy } from "../utils/ocean.js";
import { newBirdsClientWithProxy } from "../utils/birds.js";
import { newPawsClientWithProxy } from "../utils/paws.js";
import { newCloudScraperClientWithProxy } from "../utils/cloudscraper.js";
import { registerExtension } from "../utils/selenium-extensions.js";
import { generateUniqueId } from "../utils/gradient-network.js";
const secretVault = {};
const publicKeyToSecretVault = {};
const wallet = new SuiWallet();
export const nearWallet = new NearWallet();
export const evmWallet = new EthWallet();
const keyStore = new InMemoryKeyStore();
const connectionConfig = {
  networkId: "mainnet",
  keyStore,
  nodeUrl: "https://rpc.mainnet.near.org",
  walletUrl: "https://wallet.mainnet.near.org",
  helperUrl: "https://helper.mainnet.near.org",
  explorerUrl: "https://nearblocks.io",
};

const { exec } = newSemaphore();

export const addToSecretVault = async (
  fileName,
  str = "",
  type = "sui",
  mappingSecrets = [],
  defaultInitParams
) =>
  await exec(async () => {
    let privateKeys = str
      .split("\n")
      .filter((s) => s)
      .map((s) => s.trim().split(","))
      .map(
        ([
          id,
          privateKey,
          receiveAddress,
          startDate,
          startTime,
          comission,
          proxyStr,
        ]) => {
          let proxy;
          if (proxyStr && proxyStr.split(":").length == 4) {
            const parts = proxyStr.split(":");
            proxy = {
              user: parts[2]?.trim?.(),
              passsword: parts[3]?.trim?.(),
              ip: parts[0]?.trim?.(),
              port: parts[1]?.trim?.(),
            };
          }
          return {
            id,
            fileName,
            privateKey,
            receiveAddress,
            startDate: moment(
              `${(startDate || "").trim()} ${(startTime || "")
                .trim()
                .padStart(2, "0")}:00:00`,
              "DD/MM/YYYY hh:mm:ss"
            ).toDate(),
            comission,
            type,
            proxy,
            proxyStr,
          };
        }
      )
      .filter(({ privateKey }) => privateKey);
    let header;
    let maxIndex = privateKeys.length + mappingSecrets.length;
    [header, ...privateKeys] = privateKeys;
    secretVault[fileName] = await Promise.all(
      privateKeys.map(async (privateKeyObject) => {
        privateKeyObject.index = maxIndex;
        maxIndex++;
        privateKeyObject.log = (msg) =>
          console.log(`${privateKeyObject.id} ${msg}`);
        privateKeyObject.error = (e) =>
          console.error(
            `${privateKeyObject.id} ERROR: ${
              e?.response?.data?.message ||
              e?.response?.data?.msg ||
              e?.response?.data?.detail ||
              e?.response?.data?.error ||
              e?.response?.data?.error_code ||
              e?.response?.data ||
              e?.message ||
              e
            }`
          );
        privateKeyObject.exec = newSemaphore().exec;
        privateKeyObject.walletExec = newSemaphore().exec;
        switch (type) {
          case "sui":
            if (privateKeyObject.receiveAddress) {
              privateKeyObject.initParams = atob(
                privateKeyObject.receiveAddress
              );
            } else if (defaultInitParams) {
              privateKeyObject.initParams = defaultInitParams;
            }
            privateKeyObject.client = newOceanClientWithProxy(
              privateKeyObject.proxy
            );
            return await generateSuiAddress(privateKeyObject);
          case "near":
            return await generateHotAddress(privateKeyObject);
          case "sei":
            return await generateSeiAddress(privateKeyObject);
          case "bahamut":
            return await generateBahamutAddress(privateKeyObject);
          case "meme":
            privateKeyObject = await generateEvmAddress(privateKeyObject);
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newMemeClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = defaultMemeClient;
            }
            return privateKeyObject;
          case "fish":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            const { __cf_bm, ci_session, init_params } = JSON.parse(
              privateKeyObject.privateKey
            );
            privateKeyObject.__cf_bm = __cf_bm;
            privateKeyObject.ci_session = ci_session;
            privateKeyObject.setNewSession = (__cf_bm, ci_session) => {
              let newPrivateKey = [`__cf_bm=${privateKeyObject.__cf_bm}`];
              if (__cf_bm) {
                privateKeyObject.__cf_bm = __cf_bm;
                newPrivateKey = [`__cf_bm=${__cf_bm}`];
              }
              if (!ci_session) {
                ci_session = privateKeyObject.ci_session;
              }
              privateKeyObject.ci_session = ci_session;
              if (ci_session) {
                newPrivateKey = [`ci_session=${ci_session}`, ...newPrivateKey];
              }
              privateKeyObject.privateKey = newPrivateKey.join(";");
            };
            privateKeyObject.privateKey = "";
            privateKeyObject.teleInitParams = init_params;
            return privateKeyObject;
          case "spell":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newSpellClientWithProxy(
                privateKeyObject.proxy
              );
            }
            return privateKeyObject;
          case "hamster":
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newHamsterClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = defaultHamsterClient;
            }
            await generateTonAddress(privateKeyObject);
            return privateKeyObject;
          case "memefi":
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newMemefiClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = defaultMemefiClient;
            }
            return privateKeyObject;
          case "spinner":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newSpinnerClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = defaultSpinnerClient;
            }
            await generateTonAddress(privateKeyObject);
            return privateKeyObject;
          case "pixelVerse":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newPixelVerseClientWithProxy(
                privateKeyObject.proxy,
                privateKeyObject.privateKey
              );
            } else {
              privateKeyObject.client = newPixelVerseClientWithProxy(
                "",
                privateKeyObject.privateKey
              );
            }
            if (privateKeyObject.receiveAddress) {
              privateKeyObject = generateEvmAddress(
                privateKeyObject,
                privateKeyObject.receiveAddress
              );
            }
            return privateKeyObject;
          case "timefarm":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newTimeFarmClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = newTimeFarmClientWithProxy("");
            }
            return privateKeyObject;
          case "yescoin":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            if (privateKeyObject.privateKey?.includes?.(`"initParams"`)) {
              const {initParams, token} = JSON.parse(privateKeyObject.privateKey);
              privateKeyObject.privateKey = initParams;
              privateKeyObject.token = token;
            }
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newYesCoinClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = newYesCoinClientWithProxy("");
            }
            await generateTonAddress(privateKeyObject);
            return privateKeyObject;
          case "djdog":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newDJDogClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = newDJDogClientWithProxy("");
            }
            await generateTonAddress(privateKeyObject);
            return privateKeyObject;
          case "banana":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            privateKeyObject.client = newCloudScraperClientWithProxy(
              privateKeyObject,
              privateKeyObject.proxy
            );
            await generateTonAddress(privateKeyObject);
            return privateKeyObject;
          case "tomarket":
            const data = atob(privateKeyObject.privateKey);
            const { initParams, token } = JSON.parse(data);
            privateKeyObject.privateKey = initParams;
            privateKeyObject.token = token;
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newTomarketClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = newTomarketClientWithProxy("");
            }
            await generateTonAddress(privateKeyObject);
            return privateKeyObject;
          case "lostdog":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newLostDogClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = newLostDogClientWithProxy("");
            }
            await generateTonAddress(privateKeyObject);
            return privateKeyObject;
          case "duckchain":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newDuckChainClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = newDuckChainClientWithProxy();
            }
            return privateKeyObject;
          case "memelandtg":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newMemelandTgClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = newMemelandTgClientWithProxy();
            }
            return privateKeyObject;
          case "dogs":
            privateKeyObject.privateKey = JSON.parse(
              atob(privateKeyObject.privateKey)
            );
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newDogsClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = newDogsClientWithProxy();
            }
            await generateTonAddress(privateKeyObject);
            const address = getWallet(privateKeyObject);
            privateKeyObject.index =
              mappingSecrets.find(({ id }) => id == privateKeyObject.id)
                ?.index || privateKeyObject.index;
            await Promise.all(
              mappingSecrets.map(async (mappingSecret) => {
                if (!address) return;
                const addressV4 = (await mappingSecret?.getWallet())?.address;
                const addressV5 = (await mappingSecret?.getWalletV5())?.address;
                if (!addressV4) return;
                // console.log(nonBounceableFmt(address) + nonBounceableFmt(addressV4) + nonBounceableFmt(addressV5))
                if (nonBounceableFmt(address) == nonBounceableFmt(addressV4)) {
                  privateKeyObject.receiveAddress = mappingSecret.privateKey;
                  privateKeyObject.isV5 = false;
                  await generateTonAddress(privateKeyObject);
                } else if (
                  nonBounceableFmt(address) == nonBounceableFmt(addressV5)
                ) {
                  privateKeyObject.receiveAddress = mappingSecret.privateKey;
                  privateKeyObject.isV5 = true;
                  await generateTonAddress(privateKeyObject);
                }
              })
            );
            return privateKeyObject;
          case "blum":
            let blumAuth = JSON.parse(atob(privateKeyObject.privateKey));
            privateKeyObject.privateKey = blumAuth.initParams;
            privateKeyObject.token = blumAuth.token;
            privateKeyObject.refreshToken = blumAuth.refreshToken;
            privateKeyObject.referralToken = blumAuth.referralToken;
            privateKeyObject.client = newBlumClientWithProxy(
              privateKeyObject.proxy
            );
            await generateTonAddress(privateKeyObject);
            return privateKeyObject;
          case "major":
            let majorAuth = JSON.parse(atob(privateKeyObject.privateKey));
            privateKeyObject.privateKey = majorAuth.initParams;
            privateKeyObject.referralToken = majorAuth.referralToken;
            privateKeyObject.client = newMajorClientWithProxy(
              privateKeyObject.proxy
            );
            return privateKeyObject;
          case "ton":
            await generateTonAddress(privateKeyObject, "privateKey");
            return privateKeyObject;
          case "cats":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            privateKeyObject.client = newCatsClientWithProxy(
              privateKeyObject.proxy
            );
            return privateKeyObject;
          case "birds":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            privateKeyObject.client = newBirdsClientWithProxy(
              privateKeyObject.proxy
            );
            if (privateKeyObject.receiveAddress) {
              await generateSuiAddress(privateKeyObject, "receiveAddress");
            }
            return privateKeyObject;
          case "proxy":
            if (privateKeyObject.proxy) {
              privateKeyObject.client = newProxyClientWithProxy(
                privateKeyObject.proxy
              );
            } else {
              privateKeyObject.client = defaultProxyClient;
            }
            return privateKeyObject;
          case "paws":
            privateKeyObject.privateKey = atob(privateKeyObject.privateKey);
            privateKeyObject.client = newPawsClientWithProxy(
              privateKeyObject.proxy
            );
            await generateTonAddress(privateKeyObject);
            return privateKeyObject;
          case "gradient":
            const [username, password] = privateKeyObject.privateKey.split("|");
            privateKeyObject.username = username;
            privateKeyObject.password = password;
            registerExtension(privateKeyObject, generateUniqueId(privateKeyObject), "gradient");
            return privateKeyObject;
          default:
            throw new Error(`Account type ${type} is not defined!`);
        }
      })
    );
    secretVault[fileName].sort((a, b) => a.index - b.index);
    return secretVault[fileName];
  });

const generateBahamutAddress = async (privateKeyObject) => {
  const { privateKey } = privateKeyObject;
  let param = {
    mnemonic: privateKey,
    hdPath: await evmWallet.getDerivedPath({ index: 0 }),
  };
  const truePrivateKey = await evmWallet.getDerivedPrivateKey(param);
  privateKeyObject.privateKey = truePrivateKey;
  const { address } = await evmWallet.getNewAddress({
    privateKey: truePrivateKey,
  });
  privateKeyObject.address = address;
  const signer = bahamutClient.eth.accounts.privateKeyToAccount(truePrivateKey);
  bahamutClient.eth.accounts.wallet.add(signer);
  return privateKeyObject;
};

const generateEvmAddress = async (
  privateKeyObject,
  privateKey = privateKeyObject.privateKey
) => {
  let param = {
    mnemonic: privateKey,
    hdPath: await evmWallet.getDerivedPath({ index: 0 }),
  };
  const truePrivateKey = await evmWallet.getDerivedPrivateKey(param);
  privateKeyObject.privateKey = truePrivateKey;
  const { address } = await evmWallet.getNewAddress({
    privateKey: truePrivateKey,
  });
  privateKeyObject.address = address;
  const signer = evmClient.eth.accounts.privateKeyToAccount(truePrivateKey);
  evmClient.eth.accounts.wallet.add(signer);
  return privateKeyObject;
};

const generateTonAddress = async (
  privateKeyObject,
  fieldName = "receiveAddress"
) => {
  privateKeyObject.address = async () =>
    await privateKeyObject.walletExec(async () => {
      if (!privateKeyObject[fieldName]) return null;
      if (privateKeyObject._address) return privateKeyObject._address;
      let mnemonics = privateKeyObject[fieldName]?.trim?.()?.split(" ");
      let keyPair = await mnemonicToPrivateKey(mnemonics);
      let wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      let walletv5 = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      privateKeyObject._wallet = wallet;
      privateKeyObject._walletv5 = walletv5;
      privateKeyObject._rawAddress = wallet.address.toRawString();
      privateKeyObject._address = wallet.address.toString();
      privateKeyObject._publicKey = wallet.publicKey.toString("hex");
      privateKeyObject._keyPair = keyPair;
      return privateKeyObject._address;
    });
  privateKeyObject.getUSDTAddress = async () => {
    if (privateKeyObject._jettonUSDT) return privateKeyObject._jettonUSDT;
    if (!privateKeyObject._wallet) return null;
    await privateKeyObject.address();
    privateKeyObject._jettonUSDT = await getUsdtAddress(
      privateKeyObject._wallet.address
    );
    return privateKeyObject._jettonUSDT;
  };
  privateKeyObject.getDOGSAddress = async () => {
    if (privateKeyObject._jettonDOGS) return privateKeyObject._jettonDOGS;
    if (!privateKeyObject._wallet) return null;
    await privateKeyObject.address();
    privateKeyObject._jettonDOGS = await getDogsAddress(
      privateKeyObject._wallet.address
    );
    return privateKeyObject._jettonDOGS;
  };
  privateKeyObject.getWallet = async () => {
    await privateKeyObject.address();
    return privateKeyObject._wallet;
  };
  privateKeyObject.getWalletV5 = async () => {
    await privateKeyObject.address();
    return privateKeyObject._walletv5;
  };
  privateKeyObject.getKeyPair = async () => {
    await privateKeyObject.address();
    return privateKeyObject._keyPair;
  };
  privateKeyObject.rawAddress = async () => {
    await privateKeyObject.address();
    return privateKeyObject._rawAddress;
  };
  privateKeyObject.publicKey = async () => {
    await privateKeyObject.address();
    return privateKeyObject._publicKey;
  };
  return privateKeyObject;
};

const generateSeiAddress = async (privateKeyObject) => {
  const { privateKey } = privateKeyObject;
  const wallet = await restoreWallet(privateKey);
  const [account] = await wallet.getAccounts();
  if (account) {
    privateKeyObject.address = account.address;
  } else {
    throw new Error("account not found");
  }
  privateKeyObject.getSigner = async () => {
    if (privateKeyObject._signer) return privateKeyObject._signer;
    const signer = await getOfflineSignerAmino({
      mnemonic: privateKeyObject.privateKey,
      chain: getSeiChain(),
    });
    privateKeyObject._signer = signer;
    return signer;
  };
  privateKeyObject.getClient = async () => {
    if (privateKeyObject._client) return privateKeyObject._client;
    const signer = await privateKeyObject.getSigner();
    const client = await SigningCosmWasmClient.connectWithSigner(
      seiRpcURL,
      signer,
      {
        gasPrice: GasPrice.fromString("0.025usei"),
      }
    );
    privateKeyObject._client = client;
    return client;
  };
  return privateKeyObject;
};

const generateHotAddress = async (privateKeyObject) => {
  let { privateKey } = privateKeyObject;
  if (!privateKey.startsWith("ed25519:")) {
    let param = {
      mnemonic: privateKey,
      hdPath: await nearWallet.getDerivedPath({ index: 0 }),
    };
    const truePrivateKey = await nearWallet.getDerivedPrivateKey(param);
    privateKeyObject.privateKey = truePrivateKey;
  }
  privateKeyObject.address = nearWallet.getBase58Address(
    privateKeyObject.privateKey
  );
  privateKeyObject.keyPair = () => {
    return KeyPair.fromString(privateKeyObject.privateKey);
  };
  privateKeyObject.init = () => {
    keyStore.setKey("mainnet", privateKeyObject.id, privateKeyObject.keyPair());
  };
  privateKeyObject.getPublicKey = () => {
    return privateKeyObject.keyPair().getPublicKey().toString();
  };
  privateKeyObject.getAccount = async () => {
    if (privateKeyObject._account) return privateKeyObject._account;
    privateKeyObject.init();
    const nearConnection = await connect(connectionConfig);
    // verify the id
    const account = await nearConnection.account(privateKeyObject.id);
    const res = await account.getConnection().provider.query({
      request_type: "view_access_key_list",
      finality: "final",
      account_id: privateKeyObject.id,
    });
    if (res?.keys[0]?.public_key != privateKeyObject.getPublicKey()) {
      throw new Error(
        `Public key ${privateKeyObject.getPublicKey()} don't have the access to the account ${
          privateKeyObject.id
        }`
      );
    }
    privateKeyObject._account = account;
    return account;
  };
  publicKeyToSecretVault[privateKeyObject.address] = privateKeyObject;
  return privateKeyObject;
};

const generateSuiAddress = async (
  privateKeyObject,
  fieldName = "privateKey"
) => {
  let privateKey = privateKeyObject[fieldName];
  let keypair;
  if (privateKey.startsWith("suiprivkey")) {
    const rawPrivateKey = tryDecodeSuiPrivateKey(privateKey);
    const privateKeyBytes = Uint8Array.from(
      Buffer.from(rawPrivateKey.slice(2), "hex")
    );
    keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
  } else {
    keypair = Ed25519Keypair.deriveKeypair(
      privateKey,
      DEFAULT_ED25519_DERIVATION_PATH
    );
  }
  const { address } = await wallet.getNewAddress({
    privateKey: keypair.getSecretKey(),
  });
  privateKeyObject.address = address;
  privateKeyObject.keyPair = () => keypair;
  publicKeyToSecretVault[privateKeyObject.address] = privateKeyObject;
  return privateKeyObject;
};

export const getAddressListByFileName = async (file) =>
  await exec(async () => secretVault[file].map(({ address }) => address));

export const getSecretsByFileName = async (file) =>
  await exec(async () => secretVault[file]);

export const getPrivateKeyByAddress = (address) =>
  publicKeyToSecretVault[address];
