import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { parseTgUserFromInitParams } from "./helper.js";
import { Address } from "@ton/core";
import { nonBounceableFmt } from "./balance-ton.js";

const commonHeaders = {
  accept: "application/json",
  "accept-language": "en-US,en;q=0.9,vi;q=0.8",
  priority: "u=1, i",
  "sec-ch-ua":
    '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  Referer: "https://onetime.dog/",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export const newDogsClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api.onetime.dog",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

export async function getRewardFromTokenTable(secret) {
  const address = getWallet(secret);
  if (!address) return 0;
  const response = await secret.client.post(`https://ton-claim.sign.tg/api/airdrop-open/query`, {
    "recipient": nonBounceableFmt(address),
    "projectId":"AD_esdFer2shKO3",
    "recipientType":"WalletAddress"
  }, {
    headers: commonHeaders,
  });
  if (!response.data.success) throw response.data.message;
  return  (parseInt((response.data.data?.claims?.[0]?.amount || 0)) / 1_000_000_000).toFixed(1);
}

export async function getReward(secret) {
  const { telegram_id } = secret.privateKey;
  const response = await secret.client.get(`/rewards?user_id=${telegram_id}`, {
    headers: commonHeaders,
  });

  return response.data.total;
}

export function getWallet(secret) {
  return secret.privateKey.wallet ? Address.parse(secret.privateKey.wallet) : null;
}

export function getReference(secret) {
  return secret.privateKey.reference;
}

export function getWithdrawMethod(secret) {
  return secret.privateKey.withdraw_to;
}

export function isWithdrawn(secret) {
  return secret.privateKey.is_withdrawn;
}


export async function getWithdrawalInfo(secret) {
  const response = await secret.client.get(
    `https://withdrawal.onetime.dog/withdrawal/${getReference(secret)}`,
    {
      headers: { ...commonHeaders },
    }
  );
  if (response.data.ok == false && response.data.error != "No choose option") throw new Error(response.data.error);

  return response.data.data;
}
