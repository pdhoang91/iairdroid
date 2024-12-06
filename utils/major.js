import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getTokenExpirationDate, isTokenExpired, parseTgUserFromInitParams, randomInt } from "./helper.js";
import { getItemObj, removeItem, setItem } from "../config/network.js";

const commonHeaders = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
  'Content-Type': 'application/json',
  'Origin': 'https://major.bot',
  'Referer': 'https://major.bot/',
  'Sec-Ch-Ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
};

export const newMajorClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://major.bot/api",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

const loginKey = (id) => `major_login_v1_${id}`;
export async function login(secret, refferalID = "1256279535", printLog = true) {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  const data = getItemObj(loginKey(id))
  if (data) {
    secret.token = data.access_token;
  }
  if (secret.token && !isTokenExpired(secret.token)) return data;

  if (secret.referralToken) {
    refferalID = secret.referralToken
  }
  const reqData = { init_data: secret.privateKey }
  if (printLog) {
    secret.log(`Đăng nhập bằng init params`)
  }
  const response = await secret.client.post('/auth/tg/', reqData, { headers: { ...commonHeaders } });
  const token = response.data.access_token
  if (!token) throw new Error(response.data.detail)
  secret.token = token;
  setItem(loginKey(id), response.data, getTokenExpirationDate(token) - new Date())
  return response.data;
}

export async function getUserInfo(secret, userId) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }
  const response = await secret.client.get(`/users/${userId}/`, { headers });
  return response.data;
}

export async function getStreak(secret) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }
  const response = await secret.client.get("/user-visits/streak/", { headers });
  return response.data;
}

export async function postVisit(secret) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }

  const response = await secret.client.post("/user-visits/visit/", {}, { headers });
  return response.data;
}

export async function spinRoulette(secret) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }

  try {
    const response = await secret.client.post("/roulette/", {}, { headers });
    return response.data;
  } catch (e) {
    if (e?.response?.data?.detail?.blocked_until > 0) {
      return false
    }
    throw e
  }
}

export async function isRouletteAvailable(secret) {
  return await isGameAvailable(secret, "/roulette/")
}

export async function isGameAvailable(secret, path) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }

  try {
    const response = await secret.client.get(path, { headers });
    return { available: true };
  } catch (e) {
    if (e?.response?.data?.detail?.blocked_until > 0) {
      return { available: false, waitTime: new Date(e?.response?.data?.detail?.blocked_until * 1000) - new Date() }
    }
    throw e
  }
}

export async function isHoldCoinAvailable(secret) {
  return await isGameAvailable(secret, "/bonuses/coins/")
}

export async function holdCoins(secret, coins) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }

  const payload = { coins };
  try {
    const response = await secret.client.post("/bonuses/coins/", payload, { headers });
    return response.data;
  } catch (e) {
    if (e?.response?.data?.detail?.blocked_until > 0) {
      return false
    }
    throw e
  }
}

export async function isSwipeCoinAvailable(secret) {
  return await isGameAvailable(secret, "/swipe_coin/")
}

export async function swipeCoins(secret, coins) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }

  const payload = { coins };
  try {
    const response = await secret.client.post("/swipe_coin/", payload, { headers });
    return response.data;
  } catch (e) {
    if (e?.response?.data?.detail?.blocked_until > 0) {
      return false
    }
    throw e
  }
}

export async function getDailyTasks(secret) {
  return await getTasks(secret, true)
}

export async function getTasks(secret, isDailyTask = false) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }

  const response = await secret.client.get(`/tasks?is_daily=${isDailyTask}`, { headers });
  return response.data;
}

export async function completeTask(secret, task) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }
  const payload = { task_id: task.id };

  try {
    const response = await secret.client.post("/tasks/", payload, { headers });
    return response.data;
  } catch (e) {
    if (e?.response?.status == 429) {
      return false
    }
    throw e;
  }
}

export async function leaveSquad(secret) {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }

  const response = await secret.client.post(`/squads/leave/`, null, { headers });
  if (response.data?.status != "ok") throw new Error(JSON.stringify(response.data?.detail));
  removeItem(loginKey(id))
  return response.data;
}

export async function joinSquad(secret, squadId = "2154561585") {
  const headers = { ...commonHeaders, Authorization: `Bearer ${secret.token}` }

  const response = await secret.client.post(`/squads/${squadId}/join/`, null, { headers });
  if (response.data?.status != "ok") throw new Error(JSON.stringify(response.data?.detail));
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  removeItem(loginKey(id))
  return response.data;
}