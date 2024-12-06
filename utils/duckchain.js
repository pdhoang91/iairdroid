import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { parseTgUserFromInitParams } from "./helper.js";

const commonHeaders = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9,vi;q=0.8",
  origin: "https://tgdapp.duckchain.io",
  priority: "u=1, i",
  referer: "https://tgdapp.duckchain.io/",
  "sec-ch-ua":
    '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

export const newDuckChainClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://ppp.duckchain.io",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

export const getUserInfo = async (secret) => {
  const headers = {
    ...commonHeaders,
    authorization: "tma " + secret.privateKey,
  };
  const response = await secret.client.get("/user/info", { headers });
  if (response.status == 200 && response.data.code != 200)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const setDuckName = async (secret, duckName) => {
  const headers = {
    ...commonHeaders,
    authorization: "tma " + secret.privateKey,
  };
  const response = await secret.client.get(
    "/user/set_duck_name?duckName=" + encodeURIComponent(duckName),
    { headers }
  );
  if (response.status == 200 && response.data.code != 200)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data;
};

export const bindInviter = async (secret, inviteCode) => {
  const headers = {
    ...commonHeaders,
    authorization: "tma " + secret.privateKey,
  };
  const response = await secret.client.get(
    "/user/bind_invite?inviteCode=" + inviteCode,
    { headers }
  );
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message || JSON.stringify(response.data));
  return response.data;
};

export const getCardInfo = async (secret) => {
  const headers = {
    ...commonHeaders,
    authorization: "tma " + secret.privateKey,
  };
  const response = await secret.client.get("/user/get_card_info", { headers });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

export const login = async (secret, inviteCode = "PWt1MbYf") => {
  let newAccount = false;
  const userInfo = await getUserInfo(secret);
  if (!userInfo?.duckName) {
    newAccount = true;
    const { id } = parseTgUserFromInitParams(secret.privateKey);
    const defaultName = `sg_${id}_duck2024`;
    secret.log(`Đặt duck name là ${userInfo.defaultName || defaultName}`);
    await setDuckName(secret, userInfo.defaultName);
  }
  if (!userInfo.hasInviter && userInfo.cardId != 43579) {
    secret.log(`Gắn ref cho ${userInfo.defaultName} với mã ${inviteCode}`);
    await bindInviter(secret, inviteCode);
  }
  if (newAccount) {
    const { profession } = await getCardInfo(secret);
    secret.log(`Đã nhận card ${profession}`);
    return login(secret);
  }
  return userInfo;
};

export const tap = async (secret) => {
  const headers = {
    ...commonHeaders,
    authorization: "tma " + secret.privateKey,
  };
  const response = await secret.client.get("/quack/execute?", { headers });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

export const getInviteInfo = async (secret) => {
  const headers = {
    ...commonHeaders,
    authorization: "tma " + secret.privateKey,
  };
  const response = await secret.client.get("/user/get_invite_info", {
    headers,
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  const { inviteCode, boxesEarned } = response.data.data;
  return { inviteCode, boxesEarned };
};

export const openBox = async (secret) => {
  const headers = {
    ...commonHeaders,
    authorization: "tma " + secret.privateKey,
  };
  const response = await secret.client.get("/box/open?openType=-1", {
    headers,
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  const { quantity, obtain, boxesLeft } = response.data.data;
  return { quantity, obtain, boxesLeft };
};

export const nftAirdropRecords = async (secret) => {
  const response = await secret.client.get("/nft/airdrop/records", {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

// [
//   {
//     "id": 55,
//     "name": "XPLUS",
//     "description": "A tech-forward duck on the cutting edge of TON and Web3 technologies, constantly innovating within the crypto space.",
//     "img_url": "https://static.duckchain.io/nft_img/XPLUS.png",
//     "amount": 1
//   },
//   {
//     "id": 56,
//     "name": "Roast Duck",
//     "description": "A duck that quacked so hard it got roasted! Now it's a tasty symbol of fun and adventure in the Web3 world.",
//     "img_url": "https://static.duckchain.io/nft_img/Roast%20Duck.jpg",
//     "amount": 1
//   }
// ]
export const getMyNft = async (secret) => {
  const response = await secret.client.get("/nft/user/own", {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

// {
//   "currentBalance": {
//     "testStar": 5,
//     "ton": 0.00282817
//   },
//   "cumulativeConsumption": {
//     "testStar": "0.000"
//   },
//   "nft": {
//     "remainingMints": 4,
//     "currentlyInvited": 1
//   },
//   "mintInfo": {
//     "id": 48,
//     "name": "Particle",
//     "description": "A crypto wizard who manipulates the smallest particles of the blockchain, ensuring seamless interactions in the Web3 ecosystem.",
//     "metaUrl": "https://static.duckchain.io/nft_meta/Particle.json",
//     "img_url": "https://static.duckchain.io/nft_img/Particle.png"
//   }
// }
export const transportInfo = async (secret) => {
  const response = await secret.client.get("/transport/info", {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

// {
//   "social_media": [],
//   "daily": [
//     {
//       "taskId": 8,
//       "taskType": "daily_check_in",
//       "content": "Daily Check In",
//       "action": null,
//       "integral": 100,
//       "icon_url": "https://static.duckchain.io/dailysingn1.png",
//       "type": 1
//     },
//   ],
//   "oneTime": [
//     {
//       "taskId": 138,
//       "taskType": "despite-star",
//       "content": "First Star Deposit",
//       "action": "https://x.com/Duck_Chain",
//       "integral": 2000,
//       "icon_url": "https://static.duckchain.io/star1.png",
//       "type": 1
//     },
//   ],
//   "partner": [
//     {
//       "taskId": 200,
//       "taskType": "PocketFi",
//       "content": "Join PocketFi Mini App",
//       "action": "https://t.me/pocketfi_bot/Mining?startapp=6823198302",
//       "integral": 150,
//       "icon_url": "https://static.duckchain.io/onetime_PocketFi.png",
//       "type": 1
//     }
//   ]
// }
export const getTaskList = async (secret) => {
  const response = await secret.client.get("/task/task_list", {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

// {
//   "socialMedia": [
//     3,
//     5,
//     7
//   ],
//   "daily": [
//     8
//   ],
//   "partner": [
//     200
//   ],
//   "oneTime": [
//     3,
//     5,
//     6
//   ],
//   "total": "499285",
//   "twitterDaily": null,
//   "oneTimeIsFinished": 0,
//   "partnerIsFinished": 0
// }
export const getDoneTasks = async (secret) => {
  const response = await secret.client.get("/task/task_info", {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

export const dailyCheckin = async (secret) => {
  const response = await secret.client.get(
    `/task/sign_in?`,
    {
      headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
    }
  );
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

export const finishTask = async (secret, categoryType, taskId) => {
  if (!["onetime", "partner"].includes(categoryType.toLowerCase())) {
    secret.log(`Not support task type ${categoryType}`);
    return false;
  }
  const response = await secret.client.get(
    `/task/${categoryType.toLowerCase()}?taskId=${taskId}`,
    {
      headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
    }
  );
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

export const isClaimedEgg = async (secret) => {
  const response = await secret.client.get("/property/daily/isfinish?taskId=1", {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data === 1;
};

export const claimEgg = async (secret) => {
  const response = await secret.client.get("/property/daily/finish?taskId=1", {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response?.data?.code == 500 && response?.data?.message == "task type failed") {
    return false;
  }
  if (response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

// [
//   {
//     "Id": 143108,
//     "pointsAmount": 0,
//     "description": null,
//     "nftId": 38,
//     "airdropType": 2,
//     "createAt": 1731078974000,
//     "nftName": "Digital Resistance",
//     "nftUrl": "https://static.duckchain.io/nft_img/Digital Resistance.png"
//   }
// ]
export const getAvailableNftAirdrops = async (secret) => {
  const response = await secret.client.get("/nft/airdrop/records", {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

export const isClaimedAirdropNft = async (secret) => {
  const response = await secret.client.get("/property/onetime/isfinished?taskId=3", {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data === 1;
};

export const claimAirdropNft = async (secret, id) => {
  const response = await secret.client.get(`/nft/airdrop/confirm?id=${id}`, {
    headers: { ...commonHeaders, authorization: "tma " + secret.privateKey },
  });
  if (response.status == 200 && response.data?.code != 200)
    throw new Error(response.data?.message);
  return response.data.data;
};

export const getDuckLevel = (decibel) => {
  return decibel < 3e3
    ? {
        level: 1,
        levelName: "Chick Duck",
      }
    : decibel <= 1e4
    ? {
        level: 2,
        levelName: "Mediocre Duck",
      }
    : decibel <= 5e4
    ? {
        level: 3,
        levelName: "Swag Duck",
      }
    : decibel <= 2e5
    ? {
        level: 4,
        levelName: "Legendary Duck",
      }
    : decibel <= 1e6
    ? {
        level: 5,
        levelName: "Super Duck",
      }
    : {
        level: 6,
        levelName: "Ultimate Duck",
      };
};
