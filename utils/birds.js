import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { JSONStringtify, parseTgUserFromInitParams } from "./helper.js";
import { newSemaphore } from "./semaphore.js";
import { getItemObj, setItem } from "../config/network.js";

const commonHeaders = {
  Accept: "application/json, text/plain, */*",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
  "Content-Type": "application/json",
  Origin: "https://birdx.birds.dog",
  Referer: "https://birdx.birds.dog/",
  "Sec-Ch-Ua":
    '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

export const newBirdsClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api.birds.dog",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

export async function isUserCreated(secret) {
  const response = await secret.client.get(`/user`, {
    headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` },
  });
  return response.data?.balance;
}

export async function getOrCreateUser(secret) {
  const response = await secret.client.get(`/user`, {
    headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` },
  });
  if (!response.data?._id) {
    let { id, username } = parseTgUserFromInitParams(secret.privateKey);
    if (!username) {
      username = id;
    }
    return await createUser(secret, secret.referId, username, username);
  }
  return response.data;
}

export async function createUser(secret, referId = 1256279535, name, username) {
  secret.log(`Tạo tài khoản với username ${username} và ref id ${referId}`);
  const response = await secret.client.post(
    `/user`,
    {
      name,
      username,
      referId,
    },
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  if (!response.data?.balance) {
    throw new Error(JSONStringtify(response.data));
  }
  secret.log(`Tạo tài khoản thành công với ref id ${response.data.referId}`);
  return response.data;
}

export async function getRefferalId(secret) {
  const { telegramId } = await getOrCreateUser(secret);
  return telegramId;
}

export async function getWormStatus(secret) {
  const response = await secret.client.get(
    `https://worm.birds.dog/worms/mint-status`,
    { headers: { ...commonHeaders, Authorization: `tma ${secret.privateKey}` } }
  );
  return response.data.data;
}

export async function getLockWormList(secret, perPage = 1) {
  return await getWormList(secret, perPage, "locked");
}

export async function getWormList(secret, perPage = 1, status) {
  const params = {
    page: 1,
    perPage
  }
  if (status) {
    params.status = status;
  }
  const response = await secret.client.get(
    `https://worm.birds.dog/worms/me`,
    { 
      params,
      headers: { ...commonHeaders, Authorization: `tma ${secret.privateKey}` },
    }
  );
  return response.data;
}

export async function catchWorm(secret) {
  const response = await secret.client.post(
    `https://worm.birds.dog/worms/mint`,
    {},
    { headers: { ...commonHeaders, Authorization: `tma ${secret.privateKey}` } }
  );
  return response.data.data;
}

// {
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiTUlOVF9XT1JNIiwidGVsZWdyYW1JZCI6IjEyNTYyNzk1MzUiLCJpYXQiOjE3Mjk3NDE1NTMsImV4cCI6MTcyOTc0MjE1M30.NtzyKqYvUI9lc470ZMUbo05vFJZ0fYcqFWCq4w2J7iQ",
//   "signature": {
//     "type": "Buffer",
//     "data": []
//   },
//   "message": {
//     "type": "Buffer",
//     "data": []
//   }
// }
export async function getCatchWormSignature(secret, wormId, address) {
  try {
    const response = await secret.client.post(
      `https://worm.birds.dog/worms/unlock/${wormId}`,
      { address },
      {
        headers: {
          ...commonHeaders,
          authorization: `tma ${secret.privateKey}`,
        },
      }
    );
    return response.data;
  } catch (e) {
    if (e?.response?.data?.status == "WAITING") {
      secret.log(
        `Can not request unlock worm again, unlock at ${e?.response?.data?.unlockAt}`
      );
      return;
    }
    throw e;
  }
}

export async function getEggGameStatus(secret) {
  const response = await secret.client.get(
    `https://api.birds.dog/minigame/egg/join`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function getEggGameTurn(secret) {
  const response = await secret.client.get(
    `https://api.birds.dog/minigame/egg/turn`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function playEggGame(secret) {
  const response = await secret.client.get(
    `https://api.birds.dog/minigame/egg/play`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function claimEggGame(secret) {
  const response = await secret.client.get(
    `https://api.birds.dog/minigame/egg/claim`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function getIncubateInfo(secret) {
  const response = await secret.client.get(
    `https://api.birds.dog/minigame/incubate/info`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function upgradeIncubate(secret) {
  const response = await secret.client.get(
    `https://api.birds.dog/minigame/incubate/upgrade`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function confirmIncubateUpgrade(secret, userClass) {
  const payload = {}
  if (userClass) {
    secret.log(`Xác nhận chọn class ${userClass}`);
    payload.userClass = userClass;
  }
  const response = await secret.client.post(
    `https://api.birds.dog/minigame/incubate/confirm-upgraded`,
    payload,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function getTasks(secret) {
  const response = await secret.client.get(`https://api.birds.dog/project`, {
    headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` },
  });
  return response.data;
}

export async function getDoneTasks(secret) {
  const response = await secret.client.get(
    `https://api.birds.dog/user-join-task`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function finishTask(secret, task) {
  const payload = {
    taskId: task._id,
    channelId: task.channelId || "",
    slug: task.slug || "none",
    point: task.point,
  };
  const response = await secret.client.post(
    `https://api.birds.dog/project/join-task`,
    payload,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function getRefferalList(secret) {
  const response = await secret.client.get(
    `https://api.birds.dog/user/refer-list`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

// {
//   "data": {
//     "id": "1256279535",
//     "address": "0x6de1debef131e46886a9fc3d0aa1fe34326e28e2542d0f5c8aa3a8b8d8176d5e",
//     "isFaucetRequested": true
//   }
// }
export async function getWallet(secret) {
  const response = await secret.client.get(
    `https://wallet.birds.dog/users/me`,
    { headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` } }
  );
  return response.data.data;
}

export async function bindWallet(secret, address) {
  const response = await secret.client.post(
    `https://wallet.birds.dog/users/wallet`,
    { address },
    { headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` } }
  );
  return response.data.data;
}

export async function getFaucet(secret, address) {
  const response = await secret.client.post(
    `https://wallet.birds.dog/faucet`,
    { address },
    { headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` } }
  );
  return response.data.data;
}

// {
//   "id": 5146242,
//   "status": "confirmed",
//   "date": "2024-10-22",
//   "index": 1,
//   "reward": 1000000000000,
//   "tx_hash": "BfT93a5odeAcbHAq2s6Mi989nGaV9eWfRbps5YxCYmzD"
// }
export async function getLatestCheckin(secret) {
  const response = await secret.client.get(
    `https://wallet.birds.dog/tasks/checkin/latest`,
    { headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` } }
  );
  return response.data.data;
}

// {
//   "message": "0117ef16365ce3cdc1ecc9d3bc4446e43a59da65d5c50ac7a29238c53b11a3f3d30100000000000000392f645480cece1bc2d3000000000000",
//   "signature": "d3ca9cefb8fd86d05cf67ef98d0a5c982f00ce7240ce5ed60fd6609a618e1b03be0a2d77f58717c67ec0903ac1fd8ca56c3e9778e297cd99e67bcc73b0cf4d0c",
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoxLCJkYXRlIjoxNzI5NTg2NTQwLCJpbmRleCI6MSwiaWF0IjoxNzI5NTg2NTQwLCJleHAiOjE3Mjk1ODcxNDB9.vkExSGR0OHHmKRqGRJSV6ytzfgcpYTCznX0yt-np4Yw"
// }
export async function presignCheckin(secret, address) {
  const response = await secret.client.post(
    `https://wallet.birds.dog/tasks/presigned-checkin`,
    { address, type: "0x1" },
    { headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function confirmCheckin(secret, token, txHash) {
  const response = await secret.client.post(
    `https://wallet.birds.dog/tasks/confirm-checkin`,
    { token, txHash },
    { headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` } }
  );
  return response.data;
}

export async function getMyGuild(secret) {
  const response = await secret.client.get(`https://api.birds.dog/guild/me`, {
    headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` },
  });
  return response.data?.guild;
}

export async function joinGuild(secret, id) {
  const response = await secret.client.get(
    `https://api.birds.dog/guild/join/${id}`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data?.guild;
}

export async function leaveGuild(secret) {
  const response = await secret.client.get(
    `https://api.birds.dog/guild/leave`,
    { headers: { ...commonHeaders, telegramauth: `tma ${secret.privateKey}` } }
  );
  return response.data?.guild;
}

// {
//   "meta": {
//     "currentPage": 1,
//     "totalCount": 69382,
//     "pageCount": 3469
//   },
//   "data": [
//     {
//       "id": "00f2f371-6027-4c70-a847-f8c8b712a453",
//       "sellerId": "16f005a8-0c94-4037-bff4-e6f51cc9ae26",
//       "buyerId": null,
//       "status": "onSale",
//       "wormType": "rare",
//       "priceGross": 1351000000000,
//       "priceNet": 1310470000000,
//       "fee": 40530000000,
//       "listedAt": "2024-11-04T15:09:13.031Z",
//       "updatedAt": "2024-11-04T15:09:13.031Z",
//       "isOwned": false,
//       "nft": {
//         "id": "f06703e1-ea2e-4308-9ecd-99b14d3db1d2",
//         "uid": 303977912644,
//         "type": "rare",
//         "reward": 20
//       }
//     },
//   ]
// }
export async function getMarketPage(
  secret,
  type,
  page = 1,
  perPage = 10,
  isOwned = false
) {
  const params = {
    page,
    perPage,
    orderBy: "price:lowest",
    is_owned: isOwned,
  }
  if (type) {
    params.type=type
  }
  const url = `https://worm.birds.dog/markets`;
  const response = await secret.client.get(url, {
    params,
    headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` },
  });
  return response.data;
}
const { exec: priceExec } = newSemaphore(1);
const birdLowestPriceKey = (type) => `birds.lowestPrice.v1.${type}`;
export const getWormLowestPrice = (secret, type) =>
  priceExec(async () => {
    const key = birdLowestPriceKey(type);
    let lowestPrice = getItemObj(key);
    if (lowestPrice) return lowestPrice;
    secret.log(`Fetching lowest price for worm type ${type}`);
    const response = await getMarketPage(secret, type, 1, 20, false);
    const { data } = response;
    if (!data[0])
      throw new Error(
        `Not found worm price, response data: ${JSONStringtify(response)}`
      );
    lowestPrice = (data[0].priceGross / 1_000_000_000).toFixed(0);
    setItem(key, lowestPrice, 10 * 60_000);
    return lowestPrice;
  });

export const getMyListingWorms = async (secret) =>
  await getMarketPage(secret, null, 1, 50, true);

// {
//   "data": [
//     {
//       "id": "86de1d4c-6a2b-40a8-8631-d56651cdff57",
//       "marketId": "73bab1e4-8c94-4bfe-af7b-93dcb5b3e522",
//       "nftId": "dea89f6b-d8fd-4544-a340-dd5e9ab69984",
//       "buyerId": "9ea50737-c135-440b-8195-3f62424bafa0",
//       "sellerId": "e1b0ceee-6877-4997-8899-38b06478dd9c",
//       "fee": 222000000000,
//       "createdAt": "2024-10-31T08:43:36.846Z",
//       "nft": {
//         "id": "dea89f6b-d8fd-4544-a340-dd5e9ab69984",
//         "uid": 795076975306,
//         "type": "legendary",
//         "reward": 180
//       },
//       "type": "sell",
//       "amount": 7178000000000
//     },
//   ],
//   "meta": {
//     "isFirstPage": true,
//     "isLastPage": true,
//     "currentPage": 1,
//     "previousPage": null,
//     "nextPage": null,
//     "pageCount": 1,
//     "totalCount": 4
//   }
// }
export async function getMyWormTransaction(secret, page = 1, perPage = 50) {
  const response = await secret.client.get(
    `https://worm.birds.dog/markets/transactions`,
    {
      params: {
        page,
        perPage,
      },
      headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` }
    }
  );
  return response.data;
}

export async function listWormForSale(secret, wormId, price) {
  const response = await secret.client.post(
    `https://worm.birds.dog/worms/listing/${wormId}`,
    { price },
    { headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` } }
  );
  if (response.data?.message != "SUCCESS") throw new Error(`List worm fail, response: ${JSONStringtify(response.data)}`)
  return response.data;
}

// {
//   "iLocked": null,
//   "hunting": {},
//   "hunt": {
//     "maxEnergy": 60,
//     "pointReward": 6200
//   }
// }
export async function getHuntInfo(secret) {
  const response = await secret.client.get(
    `https://wallet.birds.dog/tasks/hunt-info`,
    { headers: { ...commonHeaders, authorization: `tma ${secret.privateKey}` } }
  );
  return response.data;
}