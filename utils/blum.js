import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import {
  getTokenExpirationDate,
  isTokenExpired,
  parseTgUserFromInitParams,
  randomInt,
} from "./helper.js";
import { getItemObj, setItem } from "../config/network.js";
import { v4 as uuidv4 } from "uuid";
import { handleMessage } from "./blum-game-asm.js";
import { generateTonProof } from "./balance-ton.js";

const commonHeaders = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "content-type": "application/json",
  origin: "https://telegram.blum.codes",
  referer: "https://telegram.blum.codes/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
};

export const newBlumClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://user-domain.blum.codes/api/v1",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};
const loginKey = (id) => `blum_login_v1_${id}`;
export async function login(
  secret,
  referralToken = "ueVFjH0oKY",
  isCreated = false,
  printLog = true
) {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  const data = getItemObj(loginKey(id));
  if (data) {
    secret.token = data.token;
    secret.refreshToken = data.refreshToken;
  }
  if (secret.token && !isTokenExpired(secret.token)) return secret.token;
  if (secret.refreshToken && !isTokenExpired(secret.refreshToken)) {
    try {
      if (printLog) {
        secret.log("Refresh token");
      }
      const response = await secret.client.post(
        "https://user-domain.blum.codes/api/v1/auth/refresh",
        { refresh: secret.refreshToken },
        { headers: commonHeaders }
      );
      const { access, refresh } = response.data;
      if (!access) throw new Error(response.data.message);
      setItem(
        loginKey(id),
        { token: access, refreshToken: refresh },
        getTokenExpirationDate(refresh) - new Date()
      );
      return login(secret, referralToken, isCreated, printLog);
    } catch (e) {
      secret.log(`Refresh token thất bại: ${e?.message}`);
    }
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (secret.referralToken) {
        referralToken = secret.referralToken;
      }
      const data = { query: secret.privateKey, referralToken };
      const { id, username } = parseTgUserFromInitParams(secret.privateKey);
      if (!username && !isCreated) {
        data.username = `sg_${id}_tg202409vnd`;
        if (printLog) {
          secret.log(
            `Đăng nhập bằng init params với username ${data.username} và ref code ${data.referralToken}`
          );
        }
      } else {
        if (printLog) {
          secret.log(
            `Đăng nhập bằng init params và ref code ${data.referralToken}`
          );
        }
      }
      const response = await secret.client.post(
        "https://user-domain.blum.codes/api/v1/auth/provider/PROVIDER_TELEGRAM_MINI_APP",
        data,
        { headers: { ...commonHeaders } }
      );
      if (response.status === 200) {
        if (response?.data?.justCreated) {
          secret.log(`Đã tạo tài khoản`);
        }
        const { access, refresh } = response.data.token;
        if (!access) throw new Error(response.data.message);
        setItem(
          loginKey(id),
          { token: access, refreshToken: refresh },
          getTokenExpirationDate(refresh) - new Date()
        );
        return login(secret, referralToken, isCreated, printLog);
      } else {
        secret.log(`Lấy token thất bại (${attempt})`);
      }
    } catch (error) {
      if (
        error?.response?.data?.message?.includes?.("Username is not available") ||
        error?.response?.data?.message?.includes?.(
          "account is already connected to another user"
        )
      ) {
        return await login(secret, referralToken, true, printLog);
      }
      secret.log(`Lấy token thất bại (${attempt}): ${error.message}`);
    }
  }
  return null;
}

export async function getUserInfo(secret) {
  const response = await secret.client.get(
    "https://user-domain.blum.codes/api/v1/user/me",
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  if (response.status === 200) {
    return response.data;
  } else {
    const result = response.data;
    if (result.message === "Token is invalid") {
      throw new Error(result.message);
    }
  }
}

export async function getBalance(secret) {
  const response = await secret.client.get(
    "https://game-domain.blum.codes/api/v1/user/balance",
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data;
}

// {
//   "gameId": "ba9e089b-3b29-4f21-9524-70a6efdde18a",
//   "assets": {
//     "BOMB": {
//       "probability": "0.03",
//       "perClick": "1"
//     },
//     "CLOVER": {
//       "probability": "0.95",
//       "perClick": "1"
//     },
//     "FREEZE": {
//       "probability": "0.02",
//       "perClick": "1"
//     }
//   }
// }
export async function playGame(secret) {
  try {
    const response = await secret.client.post(
      "https://game-domain.blum.codes/api/v2/game/play",
      null,
      {
        headers: {
          ...commonHeaders,
          "sec-fetch-dest": "empty",
          authorization: `Bearer ${secret.token}`,
        },
      }
    );
    return response.data;
  } catch (e) {
    if (e?.response?.status == 401) {
      await login(secret);
      return await playGame(secret);
    }
    if (e?.response?.data?.message?.includes?.("not enough")) {
      return false;
    }
    throw e;
  }
}

export async function claimGame(secret, currentGameId, blumPoints, dogPoints) {
  try {
    const hash = await generateGameHash(currentGameId, blumPoints, dogPoints);
    const body = {
      payload: hash,
    };
    const response = await secret.client.post(
      "https://game-domain.blum.codes/api/v2/game/claim",
      body,
      { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
    );
    return response.data;
  } catch (e) {
    if (e?.response?.status == 404) return;
    if (e?.response?.status == 401) {
      await login(secret);
      return await claimGame(secret, currentGameId, blumPoints);
    }
    throw e;
  }
}

const generateGameHash = async (gameId, bp, dogs) => {
  const payloadProof = {
    method: "proof",
    payload: gameId,
  };

  const proof = await callWorker(payloadProof);
  const earnedAssetsRaw = {
    bp: { value: bp },
  };
  if (dogs) {
    earnedAssetsRaw.dogs = { value: dogs };
  }
  const payloadPack = {
    method: "pack",
    payload: {
      gameId,
      challenge: proof,
      earnedAssets: calculatePoint(earnedAssetsRaw),
    },
  };
  const pack = await callWorker(payloadPack);
  return pack.hash;
};

const callWorker = async (payload) => {
  const p = uuidv4();
  return await handleMessage({
    id: p,
    ...payload,
  });
};
export const TOKEN_TO_GAME_ASSET_MAPPING = {
  bp: "CLOVER",
  dogs: "DOGS",
};

const calculatePoint = (gameData) => {
  const eventIds = Object.keys(gameData);
  return eventIds.reduce((reward, eventId) => {
    if (!gameData[eventId]) return reward;
    const token = TOKEN_TO_GAME_ASSET_MAPPING[eventId];
    return (
      (reward[token] = {
        amount: String(gameData[eventId].value),
      }),
      reward
    );
  }, {});
};

export async function claimBalance(secret) {
  const response = await secret.client.post(
    "https://game-domain.blum.codes/api/v1/farming/claim",
    {},
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data;
}

export async function startFarming(secret) {
  const response = await secret.client.post(
    "https://game-domain.blum.codes/api/v1/farming/start",
    { action: "start_farming" },
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data;
}

export async function checkBalanceFriend(secret) {
  const response = await secret.client.get(`/friends/balance`, {
    headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` },
  });
  return response.data;
}

export async function getRefferalCode(secret) {
  try {
    const response = await secret.client.get(`/friends?pageSize=1`, {
      headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` },
    });
    let { usedInvitation, referralToken } = await checkBalanceFriend(secret);
    let totalRef = response.data.nextPageToken || response.data.friends.length;
    if (usedInvitation < totalRef) usedInvitation = totalRef;
    return {
      usedInvitation,
      referralToken,
    };
  } catch (e) {
    if (e?.response?.status == 404) return null;
    throw e;
  }
}

export async function claimBalanceFriend(secret) {
  const response = await secret.client.post(
    `/friends/claim`,
    {},
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data;
}

export async function checkDailyReward(secret) {
  try {
    const response = await secret.client.post(
      "https://game-domain.blum.codes/api/v1/daily-reward?offset=-420",
      {},
      { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
    );
    return response.data;
  } catch (e) {
    if (e?.response?.status == 404 || e?.response?.data?.message == "same day")
      return;
    throw e;
  }
}

export async function getTasks(secret) {
  const response = await secret.client.get(
    "https://earn-domain.blum.codes/api/v1/tasks",
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data;
}

export async function startTask(secret, taskId) {
  try {
    const response = await secret.client.post(
      `https://earn-domain.blum.codes/api/v1/tasks/${taskId}/start`,
      {},
      { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
    );
    return response.data;
  } catch (e) {
    if (e?.response?.status == 401) {
      await login(secret);
      return await startTask(secret, taskId);
    }
    if (e?.response?.data?.message == "Task type does not support start") {
      return true;
    }
    throw e;
  }
}

export async function claimTask(secret, taskId) {
  try {
    const response = await secret.client.post(
      `https://earn-domain.blum.codes/api/v1/tasks/${taskId}/claim`,
      {},
      { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
    );
    return response.data;
  } catch (e) {
    if (e?.response?.status == 401) {
      await login(secret);
      return await claimTask(secret, taskId);
    }
    if (e?.response?.status == 412) {
      secret.log("Không đủ điều kiện hoàn thành task " + taskId);
      return false;
    }
    throw e;
  }
}

export async function getMyTribe(secret) {
  try {
    const response = await secret.client.get(
      `https://tribe-domain.blum.codes/api/v1/tribe/my`,
      { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
    );
    return response.data;
  } catch (e) {
    if (e?.response?.status == 404) return null;
    throw e;
  }
}

export async function joinTribe(secret, tribeId) {
  const response = await secret.client.post(
    `https://tribe-domain.blum.codes/api/v1/tribe/${tribeId}/join`,
    null,
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data;
}

export async function leaveTribe(secret) {
  const response = await secret.client.post(
    `https://tribe-domain.blum.codes/api/v1/tribe/leave`,
    {},
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data;
}

export async function getTribe(secret, tgHandle) {
  const response = await secret.client.get(
    `https://tribe-domain.blum.codes/api/v1/tribe/by-chatname/${tgHandle}`,
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data;
}

export async function checkDogsDrop(secret) {
  const response = await secret.client.get(
    `https://game-domain.blum.codes/api/v2/game/eligibility/dogs_drop`,
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data?.eligible;
}

export async function getWalletBalance(secret) {
  try {
    const response = await secret.client.get(
      `https://wallet-domain.blum.codes/api/v1/wallet/my/balance?fiat=usd`,
      { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
    );
    return response.data;
  } catch (e) {
    if (e?.response?.status == 404) return null
    throw e;
  }
}

export async function getWalletPointBalance(secret) {
  const response = await secret.client.get(
    `https://wallet-domain.blum.codes/api/v1/wallet/my/points/balance`,
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data?.points || [];
}

export async function getDogsBalance(secret) {
  const points = await getWalletPointBalance(secret)
  return points.find(({ symbol }) => symbol == "DOGS")?.balance || 0
}

export async function getWalletHistory(secret) {
  try {
    const response = await secret.client.get(
      `https://wallet-domain.blum.codes/api/v1/wallet/my/actions_history`,
      { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
    );
    return response.data.actions;
  } catch (e) {
    if (e?.response?.status == 404) return null
    throw e;
  }
}

// {
//   "account": {
//       "address": "0:c5f3b6e9800d36b396bddb26a8839af4c79fb378f18cbb4d223150c2c582dbcd",
//       "chain": "-239",
//       "publicKey": "c94da7746ee713746f5af58d5e9a3afa483333b1801a02913ebaf60768396811"
//   },
//   "tonProof": {
//       "name": "ton_proof",
//       "proof": {
//           "domain": {
//               "lengthBytes": 19,
//               "value": "telegram.blum.codes"
//           },
//           "payload": "1726137806129",
//           "signature": "aJmdrqNc8XPU7cwPe1osuR7TK8THU19ZUcGMCfe4zy9cXp9lARxtcgUbZiQ0d3q2E/psYy+agr0q/Xweze8zBw==",
//           "timestamp": 1726137821
//       }
//   }
// }
export async function connectWallet(secret, requestBody) {
  const response = await secret.client.post(
    `https://wallet-domain.blum.codes/api/v1/wallet/connect`,
    requestBody,
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  if (response.data != "OK") throw new Error(JSON.stringify(response.data));
  return response.data;
}

export async function disconnectWallet(secret) {
  const response = await secret.client.delete(
    `https://wallet-domain.blum.codes/api/v1/wallet/disconnect`,
    { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } }
  );
  return response.data;
}

export async function prepareConnectRequestBody(secret) {
  const address = (await secret.getWallet())?.address;
  if (!address) {
    secret.log("Missing seedphrase");
    return;
  }
  const proof = await generateBlumTonProof(secret);
  return {
    "account": {
      "address": address.toRawString(),
      "chain": "-239",
      "publicKey": await secret.publicKey(),
    },
    "tonProof": {
      "name": "ton_proof",
      "proof": proof
    }
  }
}

export async function generateBlumTonProof(secret) {
  const wallet = await secret.getWallet()
  const address = wallet?.address;
  const keyPair = await secret.getKeyPair();
  return await generateTonProof(
    wallet,
    address.toString(),
    keyPair,
    "https://telegram.blum.codes",
    `${new Date().getTime()}`
  );
}
