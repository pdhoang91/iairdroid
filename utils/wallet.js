import { SuiWallet } from "@okxweb3/coin-sui";
import { defaultInitParams, seedphases } from "../config/secret.js";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { newSemaphore } from "./semaphore.js";
import { NearWallet } from "@okxweb3/coin-near";
import { loadFile } from "./loader.js";
import { addToSecretVault } from "../config/secret-manager.js";
import { TonWallet } from "@okxweb3/coin-ton";
import tonMnemonic from "@moebius/tonweb-mnemonic";
import bip39 from "bip39";
import crypto from "crypto";
import { EthWallet } from "@okxweb3/coin-ethereum";
import { newOceanClientWithProxy } from "./ocean.js";

export const wallet = new SuiWallet();
const nearWallet = new NearWallet();
export const tonWallet = new TonWallet();
const evmWallet = new EthWallet();

let addressesMap = {},
  nearSecrets = [],
  seiSecrets = [],
  bahamutSecrets = [],
  hamsterSecrets = [],
  fishSecrets = [],
  spellSecrets = [],
  memefiSecrets = [],
  spinnerSecrets = [],
  pixelVerseSecrets = [],
  proxySecrets = [],
  memeSecrets = [],
  djDogSecrets = [],
  yescoinSecrets = [],
  bananaSecrets = [],
  tomarketSecrets = [],
  tonSecrets = [],
  lostDogSecrets = [],
  dogsSecrets = [],
  duckchainSecrets = [],
  blumSecrets = [],
  majorSecrets = [],
  catsSecrets = [],
  memelandtgSecrets = [],
  oceanSecrets = [],
  birdsSecrets = [],
  pawsSecrets = [],
  gradientSecrets = [];
const NEAR_SECRET_FILE = "secret-near.private.csv";
const SEI_SECRET_FILE = "secret-sei.private.csv";
const BAHAMUT_SECRET_FILE = "secret-bahamut.private.csv";
const HAMSTER_SECRET_FILE = "secret-hamster.private.csv";
// const HAMSTER_SECRET_FILE = "hocvien-hamster.private.csv";
const FISH_SECRET_FILE = "secret-fish.private.csv";
const SPELL_SECRET_FILE = "secret-spell.private.csv";
const MEMEFI_SECRET_FILE = "secret-memefi.private.csv";
const SPINNER_SECRET_FILE = "secret-spinner.private.csv";
// const SPINNER_SECRET_FILE = "hocvien-spinner.private.csv";
const PROXY_SECRET_FILE = "secret-proxy.private.csv";
const PixelVerse_SECRET_FILE = "secret-pixelVerse.private.csv";
const MEME_SECRET_FILE = "secret-meme.private.csv";
const DJDOG_SECRET_FILE = "secret-djdog.private.csv";
const YESCOIN_SECRET_FILE = "secret-yescoin.private.csv";
const BANANA_SECRET_FILE = "secret-banana.private.csv";
const TOMARKET_SECRET_FILE = "secret-tomarket.private.csv";
const TON_SECRET_FILE = "secret-ton.private.csv";
const LOST_DOG_SECRET_FILE = "secret-lostdog.private.csv";
const DOGS_SECRET_FILE = "secret-dogs.private.csv";
const DUCKCHAIN_SECRET_FILE = "secret-duckchain.private.csv";
const BLUM_SECRET_FILE = "secret-blum.private.csv";
const MAJOR_SECRET_FILE = "secret-major.private.csv";
const CATS_SECRET_FILE = "secret-cats.private.csv";
const MEMELANDTG_SECRET_FILE = "secret-memelandtg.private.csv";
const OCEAN_SECRET_FILE = "sponsor-account.private.csv";
const BIRDS_SECRET_FILE = "secret-birds.private.csv";
const PAWS_SECRET_FILE = "secret-paws.private.csv";
const GRADIENT_SECRET_FILE = "secret-gradient.private.csv";
const { worker: generateAddressWorker, exec } = newSemaphore();

export const generateWalletDerivativeAddresses = async (
  seedphase,
  from = 0,
  to = 99
) => {
  let result = [];
  for (let i = from; i <= to; i++) {
    let tmp = String(i).padStart(3, "0");
    let param = {
      mnemonic: seedphase,
      hdPath: `m/44'/784'/${tmp}'/0'/0'`,
    };
    let privateKey = await wallet.getDerivedPrivateKey(param);
    let { address, publicKey } = await wallet.getNewAddress({
      privateKey,
    });
    let valid = await wallet.validAddress({
      address,
    });
    if (!valid) continue;
    const secret = {
      index: i,
      privateKey,
      address,
    };
    secret.keyPair = () => {
      if (secret._keyPair) return secret._keyPair;
      secret._keyPair = Ed25519Keypair.deriveKeypair(seedphase, param.hdPath);
      return secret._keyPair;
    };
    secret.nearPrivateKey = async () => {
      if (secret._near_privateKey) return secret._near_privateKey;
      let param = {
        mnemonic: seedphase,
        hdPath: await nearWallet.getDerivedPath({ index: i }),
      };
      secret._near_privateKey = await nearWallet.getDerivedPrivateKey(param);
      return secret._near_privateKey;
    };
    result.push(secret);
  }
  return result;
};

export const getAllNearAddress = async () => {
  await getNearAddress(0);
  return nearSecrets;
};

export const getNearAddress = async (i) => {
  const { exec } = newSemaphore(20);
  if (nearSecrets.length > 0) return nearSecrets[i];
  const data = loadFile("config/" + NEAR_SECRET_FILE);
  nearSecrets = await addToSecretVault(
    NEAR_SECRET_FILE,
    data.toString("utf8"),
    "near"
  );
  await Promise.all(
    nearSecrets.map(
      async (secret) => await exec(async () => await secret.getAccount())
    )
  );
  return nearSecrets[i];
};

export const getAllSeiAddress = async () => {
  await getSeiAddress(0);
  return seiSecrets;
};

export const getSeiAddress = async (i) => {
  if (seiSecrets.length > 0) return seiSecrets[i];
  const data = loadFile("config/" + SEI_SECRET_FILE);
  seiSecrets = await addToSecretVault(
    SEI_SECRET_FILE,
    data.toString("utf8"),
    "sei"
  );
  return seiSecrets[i];
};

export const getAllBahamutAddress = async () => {
  await getBahamutAddress(0);
  return bahamutSecrets;
};

export const getBahamutAddress = async (i) => {
  if (bahamutSecrets.length > 0) return bahamutSecrets[i];
  const data = loadFile("config/" + BAHAMUT_SECRET_FILE);
  bahamutSecrets = await addToSecretVault(
    BAHAMUT_SECRET_FILE,
    data.toString("utf8"),
    "bahamut"
  );
  return bahamutSecrets[i];
};

export const getAllMemeAddress = async () => {
  await getMemeAddress(0);
  return memeSecrets;
};

export const getMemeAddress = async (i) => {
  if (memeSecrets.length > 0) return memeSecrets[i];
  const data = loadFile("config/" + MEME_SECRET_FILE);
  memeSecrets = await addToSecretVault(
    MEME_SECRET_FILE,
    data.toString("utf8"),
    "meme"
  );
  return memeSecrets[i];
};

export const getAllHamsterAddress = async () => {
  await getHamsterAddress(0);
  return hamsterSecrets;
};

export const getHamsterAddress = async (i) => {
  if (hamsterSecrets.length > 0) return hamsterSecrets[i];
  const data = loadFile("config/" + HAMSTER_SECRET_FILE);
  hamsterSecrets = await addToSecretVault(
    HAMSTER_SECRET_FILE,
    data.toString("utf8"),
    "hamster"
  );
  return hamsterSecrets[i];
};

export const getAllFishAddress = async () => {
  await getFishAddress(0);
  return fishSecrets;
};

export const getFishAddress = async (i) => {
  if (fishSecrets.length > 0) return fishSecrets[i];
  const data = loadFile("config/" + FISH_SECRET_FILE);
  fishSecrets = await addToSecretVault(
    FISH_SECRET_FILE,
    data.toString("utf8"),
    "fish"
  );
  return fishSecrets[i];
};

export const getAllSpellAddress = async () => {
  await getSpellAddress(0);
  return spellSecrets;
};

export const getSpellAddress = async (i) => {
  if (spellSecrets.length > 0) return spellSecrets[i];
  const data = loadFile("config/" + SPELL_SECRET_FILE);
  spellSecrets = await addToSecretVault(
    SPELL_SECRET_FILE,
    data.toString("utf8"),
    "spell"
  );
  return spellSecrets[i];
};

export const getAllMemefiAddress = async () => {
  await getMemefiAddress(0);
  return memefiSecrets;
};

export const getMemefiAddress = async (i) => {
  if (memefiSecrets.length > 0) return memefiSecrets[i];
  const data = loadFile("config/" + MEMEFI_SECRET_FILE);
  memefiSecrets = await addToSecretVault(
    MEMEFI_SECRET_FILE,
    data.toString("utf8"),
    "memefi"
  );
  return memefiSecrets[i];
};

export const getAllSpinnerAddress = async () => {
  await getSpinnerAddress(0);
  return spinnerSecrets;
};

export const getSpinnerAddress = async (i) => {
  if (spinnerSecrets.length > 0) return spinnerSecrets[i];
  const data = loadFile("config/" + SPINNER_SECRET_FILE);
  spinnerSecrets = await addToSecretVault(
    SPINNER_SECRET_FILE,
    data.toString("utf8"),
    "spinner"
  );
  return spinnerSecrets[i];
};

export const getAllProxyAddress = async () => {
  await getProxyAddress(0);
  return proxySecrets;
};

export const getProxyAddress = async (i) => {
  if (proxySecrets.length > 0) return proxySecrets[i];
  const data = loadFile("config/" + PROXY_SECRET_FILE);
  proxySecrets = await addToSecretVault(
    PROXY_SECRET_FILE,
    data.toString("utf8"),
    "proxy"
  );
  return proxySecrets[i];
};

export const getAllPixelVerseAddress = async () => {
  await getPixelVerseAddress(0);
  return pixelVerseSecrets;
};

export const getPixelVerseAddress = async (i) => {
  if (pixelVerseSecrets.length > 0) return pixelVerseSecrets[i];
  const data = loadFile("config/" + PixelVerse_SECRET_FILE);
  pixelVerseSecrets = await addToSecretVault(
    PixelVerse_SECRET_FILE,
    data.toString("utf8"),
    "pixelVerse"
  );
  return pixelVerseSecrets[i];
};

export const getAllDjDogAddress = async () => {
  await getDjDogAddress(0);
  return djDogSecrets;
};

export const getDjDogAddress = async (i) => {
  if (djDogSecrets.length > 0) return djDogSecrets[i];
  const data = loadFile("config/" + DJDOG_SECRET_FILE);
  djDogSecrets = await addToSecretVault(
    DJDOG_SECRET_FILE,
    data.toString("utf8"),
    "djdog"
  );
  return djDogSecrets[i];
};

export const getAllYescoinAddress = async () => {
  await getYescoinAddress(0);
  return yescoinSecrets;
};

export const getYescoinAddress = async (i) => {
  if (yescoinSecrets.length > 0) return yescoinSecrets[i];
  const data = loadFile("config/" + YESCOIN_SECRET_FILE);
  yescoinSecrets = await addToSecretVault(
    YESCOIN_SECRET_FILE,
    data.toString("utf8"),
    "yescoin"
  );
  return yescoinSecrets[i];
};

export const getAllBananaAddress = async () => {
  await getBananaAddress(0);
  return bananaSecrets;
};

export const getBananaAddress = async (i) => {
  if (bananaSecrets.length > 0) return bananaSecrets[i];
  const data = loadFile("config/" + BANANA_SECRET_FILE);
  bananaSecrets = await addToSecretVault(
    BANANA_SECRET_FILE,
    data.toString("utf8"),
    "banana"
  );
  return bananaSecrets[i];
};

export const getAllTomarketAddress = async () => {
  await getTomarketAddress(0);
  return tomarketSecrets;
};

export const getTomarketAddress = async (i) => {
  if (tomarketSecrets.length > 0) return tomarketSecrets[i];
  const data = loadFile("config/" + TOMARKET_SECRET_FILE);
  tomarketSecrets = await addToSecretVault(
    TOMARKET_SECRET_FILE,
    data.toString("utf8"),
    "tomarket"
  );
  return tomarketSecrets[i];
};

export const getAllTonAddress = async () => {
  await getTonAddress(0);
  return tonSecrets;
};

export const getTonAddress = async (i) => {
  if (tonSecrets.length > 0) return tonSecrets[i];
  const data = loadFile("config/" + TON_SECRET_FILE);
  tonSecrets = await addToSecretVault(
    TON_SECRET_FILE,
    data.toString("utf8"),
    "ton"
  );
  return tonSecrets[i];
};

export const getAllLostDogAddress = async () => {
  await getLostDogAddress(0);
  return lostDogSecrets;
};

export const getLostDogAddress = async (i) => {
  if (lostDogSecrets.length > 0) return lostDogSecrets[i];
  const data = loadFile("config/" + LOST_DOG_SECRET_FILE);
  lostDogSecrets = await addToSecretVault(
    LOST_DOG_SECRET_FILE,
    data.toString("utf8"),
    "lostdog"
  );
  return lostDogSecrets[i];
};

export const getAllDogsAddress = async () => {
  const tonAddresses = await getAllTonAddress();
  await getDogsAddress(0, tonAddresses);
  return dogsSecrets;
};

export const getDogsAddress = async (i, tonSecrets) => {
  if (dogsSecrets.length > 0) return dogsSecrets[i];
  const data = loadFile("config/" + DOGS_SECRET_FILE);
  dogsSecrets = await addToSecretVault(
    DOGS_SECRET_FILE,
    data.toString("utf8"),
    "dogs",
    tonSecrets,
  );
  return dogsSecrets[i];
};

export const getAllDuckchainAddress = async () => {
  await getDuckchainAddress(0);
  return duckchainSecrets;
};

export const getDuckchainAddress = async (i) => {
  if (duckchainSecrets.length > 0) return duckchainSecrets[i];
  const data = loadFile("config/" + DUCKCHAIN_SECRET_FILE);
  duckchainSecrets = await addToSecretVault(
    DUCKCHAIN_SECRET_FILE,
    data.toString("utf8"),
    "duckchain"
  );
  return duckchainSecrets[i];
};

export const getAllBlumAddress = async () => {
  await getBlumAddress(0);
  return blumSecrets;
};

export const getBlumAddress = async (i) => {
  if (blumSecrets.length > 0) return blumSecrets[i];
  const data = loadFile("config/" + BLUM_SECRET_FILE);
  blumSecrets = await addToSecretVault(
    BLUM_SECRET_FILE,
    data.toString("utf8"),
    "blum"
  );
  return blumSecrets[i];
};

export const getAllMajorAddress = async () => {
  await getMajorAddress(0);
  return majorSecrets;
};

export const getMajorAddress = async (i) => {
  if (majorSecrets.length > 0) return majorSecrets[i];
  const data = loadFile("config/" + MAJOR_SECRET_FILE);
  majorSecrets = await addToSecretVault(
    MAJOR_SECRET_FILE,
    data.toString("utf8"),
    "major"
  );
  return majorSecrets[i];
};

export const getAllCatsAddress = async () => {
  await getCatsAddress(0);
  return catsSecrets;
};

export const getCatsAddress = async (i) => {
  if (catsSecrets.length > 0) return catsSecrets[i];
  const data = loadFile("config/" + CATS_SECRET_FILE);
  catsSecrets = await addToSecretVault(
    CATS_SECRET_FILE,
    data.toString("utf8"),
    "cats"
  );
  return catsSecrets[i];
};

export const getAllMemelandtgAddress = async () => {
  await getMemelandtgAddress(0);
  return memelandtgSecrets;
};

export const getMemelandtgAddress = async (i) => {
  if (memelandtgSecrets.length > 0) return memelandtgSecrets[i];
  const data = loadFile("config/" + MEMELANDTG_SECRET_FILE);
  memelandtgSecrets = await addToSecretVault(
    MEMELANDTG_SECRET_FILE,
    data.toString("utf8"),
    "memelandtg"
  );
  return memelandtgSecrets[i];
};

export const getAllOceanAddress = async () => {
  await getOceanAddress(0);
  return oceanSecrets;
};

export const getOceanAddress = async (i) => {
  if (oceanSecrets.length > 0) return oceanSecrets[i];
  const data = loadFile("config/" + OCEAN_SECRET_FILE);
  oceanSecrets = await addToSecretVault(
    OCEAN_SECRET_FILE,
    data.toString("utf8"),
    "sui",
    [],
    defaultInitParams
  );
  return oceanSecrets[i];
};

export const getAllBirdsAddress = async () => {
  await getBirdsAddress(0);
  return birdsSecrets;
};

export const getBirdsAddress = async (i) => {
  if (birdsSecrets.length > 0) return birdsSecrets[i];
  const data = loadFile("config/" + BIRDS_SECRET_FILE);
  birdsSecrets = await addToSecretVault(
    BIRDS_SECRET_FILE,
    data.toString("utf8"),
    "birds"
  );
  return birdsSecrets[i];
};

export const getAllPawsAddress = async () => {
  await getPawsAddress(0);
  return pawsSecrets;
};

export const getPawsAddress = async (i) => {
  if (pawsSecrets.length > 0) return pawsSecrets[i];
  const data = loadFile("config/" + PAWS_SECRET_FILE);
  pawsSecrets = await addToSecretVault(
    PAWS_SECRET_FILE,
    data.toString("utf8"),
    "paws"
  );
  return pawsSecrets[i];
};

export const getAllGradientAddress = async () => {
  await getGradientAddress(0);
  return gradientSecrets;
};

export const getGradientAddress = async (i) => {
  if (gradientSecrets.length > 0) return gradientSecrets[i];
  const data = loadFile("config/" + GRADIENT_SECRET_FILE);
  gradientSecrets = await addToSecretVault(
    GRADIENT_SECRET_FILE,
    data.toString("utf8"),
    "gradient"
  );
  return gradientSecrets[i];
};

export const getDerivativeAddress = async (walletName, index) => {
  await generateAddressMap();
  return addressesMap[`${walletName}-${index}`];
};

export const getDefaultAddress = async (walletName) =>
  await getDerivativeAddress(walletName, 0);

const generateAddressMap = async () => {
  return await exec(async () => {
    if (Object.keys(addressesMap).length > 0) {
      return;
    }
    console.log("Generate address...");
    await Promise.all(
      seedphases.map(async ({ name, seedphase }) => {
        let addresses = await generateWalletDerivativeAddresses(seedphase);
        addresses.forEach(({ index, privateKey, address, keyPair }) => {
          addressesMap[`${name}-${index}`] = {
            privateKey,
            address,
            keyPair,
            name: `${name}-${index}`,
            id: `${name}-${index}`,
            client: newOceanClientWithProxy(),
            initParams: defaultInitParams,
            exec: newSemaphore(1).exec,
            log: (msg) => console.log(`${name}-${index} ${msg}`),
            error: (e) => console.error(`${name}-${index} ERROR: ${e?.message || e}`),
          };
        });
      })
    );
  });
};

export const generateTonSeedphases = async (count = 1) => {
  return await Promise.all(
    Array.from(Array(count).keys()).map(
      async () => await tonMnemonic.generateMnemonic()
    )
  );
};

export const generateEvmSeedphases = async (count = 1) => {
  return Array.from(Array(count).keys()).map(() => {
    var randomBytes = crypto.randomBytes(16);
    return bip39.entropyToMnemonic(randomBytes.toString("hex"));
  });
};

export const generateEvmDerivativeAddresses = async (
  seedphase,
  from = 0,
  to = 99
) => {
  let result = [];
  for (let i = from; i <= to; i++) {
    let param = {
      mnemonic: seedphase,
      hdPath: await evmWallet.getDerivedPath({ index: i }),
    };
    const privateKey = await evmWallet.getDerivedPrivateKey(param);
    const { address } = await evmWallet.getNewAddress({
      privateKey,
    });
    const secret = {
      index: i,
      privateKey,
      address,
    };
    result.push(secret);
  }
  return result;
};