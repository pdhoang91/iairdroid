import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { JSONStringtify } from "./helper.js";

const commonHeaders = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9,vi;q=0.8",
  "content-type": "application/json",
  origin: "https://mini-app.tomarket.ai",
  priority: "u=1, i",
  "sec-ch-ua":
    '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  Referer: "https://mini-app.tomarket.ai/",
};

export const newTomarketClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api-web.tomarket.ai/tomarket-game/v1",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

export const login = async (secret) => {
  if (secret.token) return secret.token;
  secret.log("Fetching new token");
  const payload = {
    init_data: secret.privateKey,
    invite_code: "",
    is_bot: false,
  };
  const response = await secret.client.post(`/user/login`, payload, {
    headers: commonHeaders,
  });
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data?.access_token;
};

export const getBalance = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/user/balance`,
    {},
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const dailyClaim = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const payload = { game_id: "fa873d13-d831-4d6f-8aee-9cff7a1d0db1" };
  const response = await secret.client.post(`/daily/claim`, payload, {
    headers: headers,
  });
  if (response.data.message == "already_check") return false;
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const startFarming = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const payload = { game_id: "53b22103-c7ff-413d-bc63-20f6fb806a07" };
  const response = await secret.client.post(`/farm/start`, payload, {
    headers: headers,
  });
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const getFarmInfo = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const payload = { game_id: "53b22103-c7ff-413d-bc63-20f6fb806a07" };
  const response = await secret.client.post(`/farm/info`, payload, {
    headers: headers,
  });
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const endFarming = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const payload = { game_id: "53b22103-c7ff-413d-bc63-20f6fb806a07" };
  const response = await secret.client.post(`/farm/claim`, payload, {
    headers: headers,
  });
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const playGame = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const payload = { game_id: "59bcd12e-04e2-404c-a172-311a0084587d" };
  const response = await secret.client.post(`/game/play`, payload, {
    headers: headers,
  });
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};
export const claimGame = async (secret, token, point) => {
  const headers = { ...commonHeaders, authorization: token };
  const payload = {
    game_id: "59bcd12e-04e2-404c-a172-311a0084587d",
    points: point,
  };
  const response = await secret.client.post(`/game/play`, payload, {
    headers: headers,
  });
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const morse = async (secret, token, task_id) => {
  const headers = { ...commonHeaders, authorization: token };
  const payload = {
    task_id: task_id,
  };
  const response = await secret.client.post(`/tasks/claim`, payload, {
    headers: headers,
  });
  if (response && (response.status === 200 || response.status === 201)) {
    return true;
  }
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return false;
};

export const getInvite = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/invite/countInvite`,
    {},
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data?.data;
};

export const getWallet = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/walletTask`,
    {},
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data?.data?.walletAddress;
};

// https://ton-connect-bridge.bgwapi.io/bridge/events?client_id=0
export const linkWallet = async (secret, token, unboundAddress) => {
  const headers = { ...commonHeaders, authorization: token };
  const payload = {
    wallet_address: unboundAddress,
  };
  const response = await secret.client.post(`/tasks/address`, payload, {
    headers: headers,
  });
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data;
};

export const deleteWallet = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/deleteAddress`,
    {},
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data;
};

export const getTasks = async (secret, token, taskId) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/list`,
    {
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const startTask = async (secret, token, taskId) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/start`,
    {
      init_data: secret.privateKey,
      task_id: taskId,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data;
};

export const checkTask = async (secret, token, taskId) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/check`,
    {
      init_data: secret.privateKey,
      task_id: taskId,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data?.data?.status;
};

export const claimTask = async (secret, token, taskId) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/claim`,
    {
      task_id: taskId,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data;
};

export const getClassmateTask = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/classmateTask`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const claimClassmateStars = async (secret, token, taskId) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/classmateStars`,
    {
      task_id: taskId,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const getRankData = async (secret, token, createIfEmpty = false) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/rank/data`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (
    response.data.status != 0 &&
    response.data.message == "System error please wait"
  )
    return null;
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  if (!response.data.data?.isCreated && createIfEmpty) {
    // console.log(response.data)
    secret.log(`Get classmate task`);
    await getClassmateTask(secret, token);
    const inBlacklist = await isInBlacklist(secret, token);
    if (inBlacklist) {
      secret.log(`User in blacklist`);
      return response.data.data;
    }
    secret.log("Get farm info");
    await getFarmInfo(secret, token);
    secret.log(`Evalute rank data: ${JSONStringtify(response.data.data)}`);
    try {
      const { tomatoStars, stars, tomatoScore } = await evaluateRank(
        secret,
        token
      );
      secret.log(
        `Evaluate success, stars=${stars}, tomatoScore=${tomatoScore} tomatoStars=${tomatoStars}`
      );
      secret.log(`Create rank`);
      const newRankData = await createRank(secret, token);
      secret.log(
        `Rank created, current rank: ${newRankData?.currentRank?.name}`
      );
      return newRankData;
    } catch (e) {
      if (e?.message == "Rank value has already been initialized") {
        secret.log(`ERROR: ${e?.message}`);
        return response.data.data;
      }
      throw e;
    }
  }
  return response.data.data;
};

export const isInBlacklist = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `https://api-web.tomarket.ai/tomarket-game/v1/rank/blacklist`,
    {},
    {
      headers: headers,
    }
  );
  if (response.data.status != 0) {
    console.log(response.data);
    throw new Error(response.data.message || JSON.stringify(response.data));
  }
  return response.data?.data?.inBlacklist != 0;
};

export const evaluateRank = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/rank/evaluate`,
    {},
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  // console.log(response.data)
  return response.data.data;
};

export const createRank = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/rank/create`,
    {},
    {
      headers: headers,
    }
  );
  if (response.data.status != 0) {
    throw new Error(response.data.message || JSON.stringify(response.data));
  }
  return response.data.data;
};

// {
//   "status": 0,
//   "message": "",
//   "data": {
//     "isCreated": true,
//     "isUpgrade": false,
//     "unusedStars": 0
//   }
// }
export const upgradeRank = async (secret, token, stars) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/rank/upgrade`,
    {
      stars,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

// {
//   "level": "Platinum I",
//   "balances": [
//     {
//       "balance_type": "Ton",
//       "balance": 0,
//       "total_balance": 0
//     },
//     {
//       "balance_type": "Tomato",
//       "balance": 17188516.9,
//       "total_balance": 17188516.9
//     },
//     {
//       "balance_type": "Star",
//       "balance": 98,
//       "total_balance": 876
//     }
//   ],
//   "isUpgradable": false
// }
export const getAssets = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/spin/assets`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

// {
//   "ticket_spin_1": 21
// }
export const getTickets = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/user/tickets`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

// {
//   "results": [
//     {
//       "amount": 9000,
//       "type": "Tomato"
//     }
//   ],
//   "orderId": "2d3a3b66-98e8-4a80-a17c-88fa6838c869"
// }
export const raffle = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/spin/raffle`,
    {
      category: "ticket_spin_1",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

// {
//   "tomaAirDrop": {},
//   "bwbReward": {},
//   "walletAddress": "UQATyvVBtDZUk_sBQKo_w3WgQF7c2gcOy3xqMfJw7549MpIy",
//   "status": 1,
//   "rank": "Platinum IV"
// }
export const checkAirdrop = async (secret, token, round = "One") => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/check`,
    {
      init_data: secret.privateKey,
      language_code: "en",
      round,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const checkAirdropOG = async(secret, token) => {
  return await checkAirdrop(secret, token, "OG");
}

export const getAirdropTasks = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/airdropTasks`,
    {
      init_data: secret.privateKey,
      language_code: "en",
      round: "One",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const showAirdropToken = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/show`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data?.data?.show;
};

export const startAirdropTask = async (secret, token, taskId) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/startTask`,
    {
      round: "One",
      task_id: taskId,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data;
};

export const checkAirdropTask = async (secret, token, taskId) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/checkTask`,
    {
      round: "One",
      task_id: taskId,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data?.data;
};

export const claimAirdropTask = async (secret, token, taskId) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/claimTask`,
    {
      round: "One",
      task_id: taskId,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data;
};

export const getTokenBalance = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/balance`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data?.total;
};

export const claimToken = async (secret, token, round = "One") => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/claim`,
    {
      round,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const claimTokenOG = async (secret, token) => {
  return await claimToken(secret, token, "OG");
}

// {
//   "tomaAirDrop": {
//     "amount": "806.4000000000001",
//     "status": 2
//   },
//   "bwbReward": {
//     "amount": "0"
//   },
//   "status": 2,
//   "claimed": false,
//   "stars": "6.72",
//   "needTomatoScore": 15740,
//   "isBoost": false,
//   "minStar": 6,
//   "round": {
//     "startTime": "2024-11-08 00:00:00",
//     "endTime": "2024-11-14 23:59:59",
//     "round": "3",
//     "name": "Three"
//   },
//   "isCurrent": false
// }
export const getSeasonToken = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/season`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const showSpin = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/spin/show`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data?.data?.show;
};

export const getCurrentTomato = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/tomatoes`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const isTaskExists = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/exists`,
    {},
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data?.exists;
};

export const showWitchPump = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/showWitchPump`,
    {
      round: "One",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data?.show;
};

export const getTomatoHistory = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/user/tomarketHistory`,
    {
      init_data: secret.privateKey,
      is_listing: true,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const swapTomatoToStars = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/token/tomatoToStar`,
    {},
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data.data;
};

export const getPuzzleTask = async (secret, token) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/puzzle`,
    {
      init_data: secret.privateKey,
      language_code: "en",
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  return response.data?.data?.[0];
};

export const claimPuzzleTask = async (secret, token, taskId, result) => {
  const headers = { ...commonHeaders, authorization: token };
  const response = await secret.client.post(
    `/tasks/puzzleClaim`,
    {
      code: result,
      task_id: taskId,
    },
    {
      headers: headers,
    }
  );
  if (response.data.status != 0)
    throw new Error(response.data.message || JSON.stringify(response.data));
  if (response.data?.data?.status && response.data?.data?.status != 0)
    throw new Error(response.data?.data?.message || JSON.stringify(response.data));
  return response.data?.data;
};

export const convertTime = (timestamp) => {
  const now = timestamp ? new Date(timestamp * 1000) : new Date(); // Multiply by 1000 if timestamp is in seconds
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0"); // Tháng bắt đầu từ 0
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
};
