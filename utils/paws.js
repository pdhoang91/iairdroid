import {
  parseTgUserFromInitParams,
  getTokenExpirationDate,
  isTokenExpired,
  JSONStringtify,
} from "./helper.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
import { getItemObj, removeItem, setItem } from "../config/network.js";

const commonHeaders = {
  'accept': 'application/json', 
  'accept-language': 'en-US,en;q=0.9,vi;q=0.8', 
  'content-type': 'application/json', 
  'origin': 'https://app.paws.community', 
  'priority': 'u=1, i', 
  'referer': 'https://app.paws.community/', 
  'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"', 
  'sec-ch-ua-mobile': '?0', 
  'sec-ch-ua-platform': '"macOS"', 
  'sec-fetch-dest': 'empty', 
  'sec-fetch-mode': 'cors', 
  'sec-fetch-site': 'same-site', 
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
};

export const newPawsClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api.paws.community/v1",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

const loginKey = (id) => `paws_login_${id}`;
export async function isLoginBefore(secret) {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  let token = getItemObj(loginKey(id));
  return token;
}

export async function login(secret, referralCode = "mxc3nI7l") {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  let token = getItemObj(loginKey(id));
  if (token) {
    if (!isTokenExpired(token)) {
      secret.token = token;
      return token;
    } else {
      removeItem(loginKey(id));
    }
  }
  referralCode = secret.referralCode || referralCode;
  const payload = {
    data: secret.privateKey,
    referralCode,
  };
  secret.log(`Login with refferal code ${referralCode}`);
  const response = await secret.client.post("/user/auth", payload, {
    headers: commonHeaders,
  });

  if (response?.data?.success) {
    let [token, _] = response.data.data;
    secret.token = token;
    setItem(loginKey(id), token, getTokenExpirationDate(token) - new Date());
    return token;
  } else throw new Error(`ERROR when login: ${JSONStringtify(response.data)}`);
}

// {
//   "_id": "67204a32377aad15914da321",
//   "chatId": 7315891021,
//   "userData": {
//       "firstname": "Conradlogwoodw🍅",
//       "avatarId": "1",
//       "wallet": "UQDF87bpgA02s5a92yaog5r0x5-zePGMu00iMVDCxYLbzVPf"
//   },
//   "referralData": {
//       "code": "5It1zCCS",
//       "referralsCount": 0
//   },
//   "gameData": {
//       "balance": 1529,
//       "todayBalance": 0
//   },
//   "claimStreakData": {
//       "lastClaimDate": 1730082994905,
//       "claimStreak": 0
//   },
//   "allocationData": {
//       "hamster": {
//           "initial": 1000,
//           "converted": 1000
//       },
//       "telegram": {
//           "premium": false,
//           "age": 365,
//           "year": 2023,
//           "converted": 0
//       },
//       "paws": {
//           "converted": 529
//       },
//       "dogs": {
//           "initial": 0,
//           "converted": 0,
//           "percent": 0
//       },
//       "notcoin": {
//           "initial": 0,
//           "converted": 0,
//           "createdAt": "2024-10-29T02:36:34.879Z"
//       },
//       "total": 1529
//   }
// }
export async function getUserInfo(secret) {
  const response = await secret.client.get("/user", {
    headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` },
  });
  if (!response?.data?.success) throw new Error(response?.data?.error || JSONStringtify(response.data));
  return response.data.data;
}

export async function getRefferalCode(secret) {
  const { referralData } = await getUserInfo(secret);
  return {
    code: referralData.code,
    referralsCount: referralData.referralsCount,
  };
}

// {
//   "acknowledged": true,
//   "modifiedCount": 1,
//   "upsertedId": null,
//   "upsertedCount": 0,
//   "matchedCount": 1
// }
export async function linkWallet(secret, address) {
  const response = await secret.client.post("/user/wallet", {wallet: address}, {
    headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` },
  });
  if (!response?.data?.success) throw new Error(response?.data?.error || JSONStringtify(response.data));
  return response.data.data;
}

export async function deleteWallet(secret) {
  return await linkWallet(secret, "");
}

// [
//   {
//     "_id": "6714e8b80f93ce482efae727",
//     "title": "Follow channel",
//     "description": "Follow our channel",
//     "type": "social",
//     "action": "link",
//     "rewards": [
//       {
//         "code": "balance",
//         "amount": 1000
//       }
//     ],
//     "counter": 1,
//     "data": "https://t.me/pawsupfam",
//     "code": "telegram",
//     "channelId": -1002465643659,
//     "progress": {
//       "current": 0,
//       "total": 1,
//       "claimed": false
//     }
//   },
//   {
//     "_id": "671b8eae22d15820f13dc618",
//     "title": "Follow twitter",
//     "description": "Follow our channel",
//     "type": "social",
//     "action": "link",
//     "rewards": [
//       {
//         "code": "balance",
//         "amount": 2000
//       }
//     ],
//     "counter": 1,
//     "data": "https://x.com/pawsupfam",
//     "code": "twitter",
//     "progress": {
//       "current": 0,
//       "total": 1,
//       "claimed": false
//     }
//   },
//   {
//     "_id": "671b8ecb22d15820f13dc61a",
//     "title": "Invite 10 friends",
//     "description": "Invite friends",
//     "type": "referral",
//     "action": "copy",
//     "rewards": [
//       {
//         "code": "balance",
//         "amount": 5000
//       }
//     ],
//     "counter": 10,
//     "data": "https://t.me/durov",
//     "code": "invite",
//     "progress": {
//       "current": 3196,
//       "total": 10,
//       "claimed": true
//     }
//   },
//   {
//     "_id": "671b8ee422d15820f13dc61d",
//     "title": "Connect wallet",
//     "description": "Connect wallet",
//     "type": "wallet",
//     "action": "wallet",
//     "rewards": [
//       {
//         "code": "balance",
//         "amount": 3000
//       }
//     ],
//     "counter": 1,
//     "data": "https://t.me/durov",
//     "code": "wallet",
//     "progress": {
//       "current": 2,
//       "total": 1,
//       "claimed": false
//     }
//   }
// ]
export async function getTaskList(secret) {
  const response = await secret.client.get("/quests/list", {
    headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` },
  });
  if (!response?.data?.success) throw new Error(response?.data?.error || JSONStringtify(response.data));
  return response.data.data;
}

export async function checkTask(secret, taskId) {
  const response = await secret.client.post("/quests/completed", {questId: taskId}, {
    headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` },
  });
  if (!response?.data?.success) throw new Error(response?.data?.error || JSONStringtify(response.data));
  return response.data.data;
}

export async function claimTask(secret, taskId) {
  const response = await secret.client.post("/quests/claim", {questId: taskId}, {
    headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` },
  });
  if (!response?.data?.success) throw new Error(response?.data?.error || JSONStringtify(response.data));
  return response.data.data;
}