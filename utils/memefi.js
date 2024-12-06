import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export const newMemefiClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api-gw-tg.memefi.club",
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
      "Content-Type": "application/json",
      Origin: "https://tg-app.memefi.club",
      Priority: "u=1, i",
      Referer: "https://tg-app.memefi.club/",
      "Sec-Ch-Ua": `"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"`,
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": `"macOS"`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36`,
    },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};
export const defaultMemefiClient = newMemefiClientWithProxy();

export const getMFGameConfig = async (secret) => {
  const payload = {
    operationName: "QUERY_GAME_CONFIG",
    variables: {},
    query:
      "query QUERY_GAME_CONFIG {\n  telegramGameGetConfig {\n    ...FragmentBossFightConfig\n    __typename\n  }\n}\n\nfragment FragmentBossFightConfig on TelegramGameConfigOutput {\n  _id\n  coinsAmount\n  currentEnergy\n  maxEnergy\n  weaponLevel\n  energyLimitLevel\n  energyRechargeLevel\n  tapBotLevel\n  currentBoss {\n    _id\n    level\n    currentHealth\n    maxHealth\n    __typename\n  }\n  freeBoosts {\n    _id\n    currentTurboAmount\n    maxTurboAmount\n    turboLastActivatedAt\n    turboAmountLastRechargeDate\n    currentRefillEnergyAmount\n    maxRefillEnergyAmount\n    refillEnergyLastActivatedAt\n    refillEnergyAmountLastRechargeDate\n    __typename\n  }\n  bonusLeaderDamageEndAt\n  bonusLeaderDamageStartAt\n  bonusLeaderDamageMultiplier\n  nonce\n  __typename\n}",
  };
  
  const response = await secret.client.post("/graphql", payload, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });
  return response.data?.data?.telegramGameGetConfig;
};

export const getMFTapbotConfig = async (secret) => {
  const payload = {
    operationName: "TapbotConfig",
    variables: {},
    query:
      "fragment FragmentTapBotConfig on TelegramGameTapbotOutput {\n  damagePerSec\n  endsAt\n  id\n  isPurchased\n  startsAt\n  totalAttempts\n  usedAttempts\n  __typename\n}\n\nquery TapbotConfig {\n  telegramGameTapbotGetConfig {\n    ...FragmentTapBotConfig\n    __typename\n  }\n}",
  };

  const response = await secret.client.post("/graphql", payload, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });
  return response.data?.data?.telegramGameTapbotGetConfig;
};

export const mFTap = async (secret, nonce, count = 10) => {
  const payload = {
    operationName: "MutationGameProcessTapsBatch",
    variables: {
      payload: {
        nonce,
        tapsCount: count,
      },
    },
    query:
      "mutation MutationGameProcessTapsBatch($payload: TelegramGameTapsBatchInput!) {\n  telegramGameProcessTapsBatch(payload: $payload) {\n    ...FragmentBossFightConfig\n    __typename\n  }\n}\n\nfragment FragmentBossFightConfig on TelegramGameConfigOutput {\n  _id\n  coinsAmount\n  currentEnergy\n  maxEnergy\n  weaponLevel\n  energyLimitLevel\n  energyRechargeLevel\n  tapBotLevel\n  currentBoss {\n    _id\n    level\n    currentHealth\n    maxHealth\n    __typename\n  }\n  freeBoosts {\n    _id\n    currentTurboAmount\n    maxTurboAmount\n    turboLastActivatedAt\n    turboAmountLastRechargeDate\n    currentRefillEnergyAmount\n    maxRefillEnergyAmount\n    refillEnergyLastActivatedAt\n    refillEnergyAmountLastRechargeDate\n    __typename\n  }\n  bonusLeaderDamageEndAt\n  bonusLeaderDamageStartAt\n  bonusLeaderDamageMultiplier\n  nonce\n  __typename\n}",
  };

  const response = await secret.client.post("/graphql", payload, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });
  return response.data?.data?.telegramGameProcessTapsBatch;
};
