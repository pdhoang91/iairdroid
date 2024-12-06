import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { isDone, parseTgUserFromInitParams, setDone } from "./helper.js";
import { getItemObj, setItem } from "../config/network.js";
import FormData from 'form-data';
import { loadFileAsStream } from "./loader.js";

const commonHeaders = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9,vi;q=0.8",
  "content-type": "application/json",
  priority: "u=1, i",
  "sec-ch-ua":
    '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  Referer: "https://cats-frontend.tgapps.store/",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export const newCatsClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api.catshouse.club",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

const userExistKey = (id) => `cats_userExist_${id}`;
export function isUserExistLocal(secret) {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  const userExist = isDone(userExistKey(id));
  return userExist;
}

export async function createUser(
  secret,
  referralCode = "SWq2xpncBrIMW6GGGX1an"
) {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  const userExist = isDone(userExistKey(id));
  if (userExist) return false;
  const url = `/user/create?referral_code=${referralCode}`;
  const headers = {
    ...commonHeaders,
    authorization: `tma ${secret.privateKey}`,
  };
  secret.log(`Try create user with referral ${referralCode}`);
  try {
    const response = await secret.client.post(url, {}, { headers });
    secret.log(`Create user success`);
    setDone(userExistKey(id), 30 * 24 * 60 * 60_000);
    return response.data;
  } catch (e) {
    if (e?.response?.data?.message?.includes?.("already exist")) {
      setDone(userExistKey(id), 30 * 24 * 60 * 60_000);
      secret.log("User already created!");
      return false;
    } else {
      throw e;
    }
  }
}

export async function getUserInfo(secret) {
  const url = `/user`;
  const headers = {
    ...commonHeaders,
    authorization: `tma ${secret.privateKey}`,
  };
  const response = await secret.client.get(url, { headers });
  return response.data;
}

const refCodeKey = (id) => `cats_refCode_${id}`;
export async function getRefCode(secret) {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  let data = getItemObj(refCodeKey(id));
  if (data) return data.referrerCode;
  const { referrerCode } = await getUserInfo(secret);
  setItem(refCodeKey(id), { referrerCode }, 30 * 24 * 60 * 60_000);
  return referrerCode;
}

export async function getTasks(secret) {
  return await getTasksOfGroup(secret, "cats");
}

export async function getTasksOkx(secret) {
  return await getTasksOfGroup(secret, "okx");
}

export async function getTasksKucoin(secret) {
  return await getTasksOfGroup(secret, "kukoin");
}

export async function getTasksBiget(secret) {
  return await getTasksOfGroup(secret, "bitget");
}

export async function getTasksOfGroup(secret, group) {
  const url = `/tasks/user?group=${group}`;
  const headers = {
    ...commonHeaders,
    authorization: `tma ${secret.privateKey}`,
  };
  const response = await secret.client.get(url, { headers });
  return response.data;
}

export async function completeTask(secret, taskId, answer) {
  let url = `/tasks/${taskId}/complete`;
  if (answer) {
    url += `?answer=${answer}`
  }
  const headers = {
    ...commonHeaders,
    authorization: `tma ${secret.privateKey}`,
  };
  const response = await secret.client.post(url, {}, { headers });
  return response.data;
}

export async function getReferralStatus(secret) {
  const url = `/user/referents`;
  const headers = {
    ...commonHeaders,
    authorization: `tma ${secret.privateKey}`,
  };
  const response = await secret.client.get(url, { headers });
  return response.data;
}

export async function getExchangeClaimStatus(secret) {
  const url = `/exchange-claim/user-request`;
  const headers = {
    ...commonHeaders,
    authorization: `tma ${secret.privateKey}`,
  };
  const response = await secret.client.get(url, { headers });
  return response.data;
}

export async function getAvatar(secret) {
  const url = `/user/avatar`;
  const headers = {
    ...commonHeaders,
    authorization: `tma ${secret.privateKey}`,
  };
  const response = await secret.client.get(url, { headers });
  return response.data;
}

export async function upgradeAvatar(secret, fileName) {
  var formData = new FormData();
  formData.append("photo", loadFileAsStream(fileName))
  const url = `/user/avatar/upgrade`;
  const headers = {
    ...commonHeaders,
    authorization: `tma ${secret.privateKey}`,
    ...formData.getHeaders()
  };
  const response = await secret.client.post(url, formData, { headers });
  return response.data;
}