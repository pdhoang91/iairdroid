import {
  sleep,
  randomInt,
  parseTgUserFromInitParams,
  getTokenExpirationDate,
  isTokenExpired,
  JSONStringtify,
} from "./helper.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
import md5 from "md5";
import { getItemObj, removeItem, setItem, storageEntries } from "../config/network.js";

//config upgrade
let upgrade_tap = true;
let max_tap_level = 8; // nâng tối đa cấp bao nhiêu

let upgrade_energy = true;
let max_energy_level = 17; // nâng tối đa cấp bao nhiêu

let upgrade_charge = true;
let max_charge_level = 17; // nâng tối đa cấp bao nhiêu

let upgrade_yespac = true;
let max_yespac_level = 5; // nâng tối đa cấp bao nhiêu

const commonHeaders = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9,vi;q=0.8",
  "content-type": "application/json",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"macOS\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "Referer": "https://www.yescoin.gold/",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
};

export const newYesCoinClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://bi.yescoin.gold",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

const loginKey = (id) => `yescoin_login_v1_${id}`;
export async function login(secret) {
  if (secret.token && !isTokenExpired(secret.token)) {
    // secret.log("Use internal token")
    return secret.token;
  }
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  let token = getItemObj(loginKey(id));
  if (token) {
    if (!isTokenExpired(token)) {
      return token;
    } else {
      removeItem(loginKey(id));
    }
  }
  const payload = { code: `${decodeURIComponent(secret.privateKey)}` };
  const response = await secret.client.post("/user/login", payload, {
    headers: commonHeaders,
  });

  if (response?.data?.code === 0) {
    token = response.data.data.token;
    setItem(loginKey(id), token, getTokenExpirationDate(token) - new Date());
    return token;
  } else throw new Error(response?.data?.message || JSONStringtify(response?.data))
}

export function getUserToken(userId) {
  return getItemObj(loginKey(userId));
}

export function getYescoinAuthMap() {
  return storageEntries(loginKey(""))
}

export async function getAccountBuildInfo(secret, token) {
  const headers = {
    ...commonHeaders,
    Token: token,
  };
  const getAccountBuildResponse = await secret.client.get(
    "/build/getAccountBuildInfo",
    { headers }
  );
  if (getAccountBuildResponse.status === 200) {
    // const {specialBoxLeftRecoveryCount,coinPoolLeftRecoveryCount, singleCoinLevel, coinPoolRecoveryLevel} = getAccountBuildResponse.data.data;
    // 	console.log(`[+] Account ${stt}: Chest: ${specialBoxLeftRecoveryCount}, Full Recovery: ${coinPoolLeftRecoveryCount}`);
    return getAccountBuildResponse.data.data;
  } else {
    throw new Error("getAccountBuildInfo: ", getAccountBuildResponse.status);
  }
}

export async function getAccountInfo(secret, token) {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get("/account/getAccountInfo", {
    headers,
  });
  return response.data.data;
}

export async function getGameInfo(secret, token) {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const gameInfoResponse = await secret.client.get("/game/getGameInfo", {
    headers,
  });
  if (gameInfoResponse.status === 200) {
    // const { coinPoolTotalCount, coinPoolLeftCount } = gameInfoResponse.data.data;
    // console.log(`[+] Account ${stt}: Energy ${coinPoolLeftCount}/${coinPoolTotalCount}`);
    return gameInfoResponse.data.data;
  } else {
    throw new Error("Account ${stt}: Error", gameInfoResponse.status);
  }
}

async function getSpecialBoxInfo(secret, token) {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get("/game/getSpecialBoxInfo", {
    headers,
  });
  if (response.status === 200) {
    return response.data.data;
  } else {
    throw new Error("Error: ", gameInfoResponse.status);
  }
}

export async function sendTapsWithTurbo(
  secret,
  token,
  exec = async (fn) => await fn()
) {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  let special_box_info = await exec(() => getSpecialBoxInfo(secret, token));
  let box_type = special_box_info.recoveryBox.boxType;
  let taps = special_box_info.recoveryBox.specialBoxTotalCount;

  const payload = { boxType: box_type, coinCount: taps };

  const response = await secret.client.post(
    "/game/collectSpecialBoxCoin",
    payload,
    { headers }
  );
  if (response && response.status === 200) {
    secret.log(`Taps Turbo +: ${taps}`);
    return response.data.data.collectStatus;
  }
  return null;
}

export async function claim(secret, token, exec = async (fn) => await fn()) {
  while (true) {
    const gameInfo = await exec(() => getGameInfo(secret, token));
    const {
      coinPoolLeftCount: availableEnergy,
      singleCoinValue: coinsPerTap,
      coinPoolTotalCount,
    } = gameInfo;

    // secret.log(JSON.stringify({coinPoolLeftCount: availableEnergy, singleCoinValue: coinsPerTap, coinPoolTotalCount}))
    const exitEnergy = (coinPoolTotalCount / 100).toFixed(0);
    if (availableEnergy < exitEnergy) {
      break;
    }

    let taps = randomInt(950, 1000);
    if (taps * coinsPerTap > availableEnergy) {
      taps = Math.floor(availableEnergy / coinsPerTap) - 1;
    }
    if (taps <= 0) return;

    await submitPoint(secret, token, taps, exec);
    await sleep(2);
  }
}

async function submitPoint(secret, token, number, exec) {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const payload = JSON.stringify(number);

  const postResponse = await exec(() =>
    secret.client.post("/game/collectCoin", payload, {
      headers,
    })
  );

  if (postResponse.status === 200) {
    const getResponse = await exec(() =>
      secret.client.get("/account/getAccountInfo", {
        headers,
      })
    );
    if (getResponse.status === 200) {
      const { totalAmount, userLevel, rank } = getResponse.data.data;
      secret.log(
        `Tap ${number} coin, số dư=${totalAmount}, Level=${userLevel}, Rank=${rank}`
      );
    } else {
      throw new Error(`Lỗi ${getResponse.status}`);
    }
  } else {
    throw new Error(`Lỗi ${postResponse.status}`);
  }
}
export async function applyEnergyBoost(secret, token) {
  const headers = {
    ...commonHeaders,
    Token: token,
  };
  const response = await secret.client.post("/game/recoverCoinPool", null, {
    headers,
  });
  if (response && response.status === 200) {
    secret.log(`Full Recovery success`);
  }
}

export async function applyTurboBoost(secret, token) {
  const headers = {
    ...commonHeaders,
    Token: token,
  };
  const response = await secret.client.post("/game/recoverSpecialBox", null, {
    headers,
  });
  if (response && response.status === 200) {
    secret.log(`Apply Turbo Boost success`);
  }
}

async function levelUp(secret, token, boost_id) {
  try {
    const headers = {
      ...commonHeaders,
      Token: token,
    };

    const payload = boost_id;

    const response = await secret.client.post("/build/levelUp", payload, {
      headers,
    });

    if (response && response.status === 200) {
      return response.data.data;
    }
  } catch (e) {
    throw new Error(`levelUp err: ${e}`);
  }
}

export async function autoUpgradeAll(
  secret,
  access_token,
  exec = async (fn) => await fn()
) {
  let boosts_info = await exec(() => getAccountBuildInfo(secret, access_token));

  let next_tap_level = boosts_info.singleCoinLevel + 1;
  let next_energy_level = boosts_info.coinPoolTotalLevel + 1;
  let next_charge_level = boosts_info.coinPoolRecoveryLevel + 1;
  let nextYespacLevel = boosts_info.swipeBotLevel + 1;

  let next_tap_price = boosts_info.singleCoinUpgradeCost;
  let next_energy_price = boosts_info.coinPoolTotalUpgradeCost;
  let next_charge_price = boosts_info.coinPoolRecoveryUpgradeCost;
  let next_yespac_price = boosts_info.swipeBotUpgradeCost;

  let userInfo = await exec(() => getAccountInfo(secret, access_token));
  let balance = userInfo.currentAmount;

  if (
    upgrade_energy &&
    balance > next_energy_price &&
    next_energy_level <= max_energy_level
  ) {
    let upenergy = await exec(() => levelUp(secret, access_token, 3));
    if (upenergy) {
      secret.log(
        `Nâng cấp fillrate level ${next_energy_level} (giá ${next_energy_price})`
      );
      balance -= next_energy_price;
    }
  }

  if (
    upgrade_charge &&
    balance > next_charge_price &&
    next_charge_level <= max_charge_level
  ) {
    let upcharge = await exec(() => levelUp(secret, access_token, 2));
    if (upcharge) {
      secret.log(
        `Nâng cấp coinlimit lên lv ${next_charge_level} (giá ${next_charge_price})`
      );
      balance -= next_charge_price;
    }
  }

  if (
    upgrade_yespac &&
    balance > next_yespac_price &&
    nextYespacLevel <= max_yespac_level
  ) {
    let upyespac = await exec(() => levelUp(secret, access_token, 4));
    if (upyespac) {
      secret.log(
        `Nâng cấp yespac level ${nextYespacLevel} (giá ${next_charge_price})`
      );
      balance -= next_yespac_price;
    }
  }

  if (
    upgrade_tap &&
    balance > next_tap_price &&
    next_tap_level <= max_tap_level
  ) {
    let uptap = await exec(() => levelUp(secret, access_token, 1));
    if (uptap) {
      secret.log(
        `Nâng cấp multi value lên level ${next_tap_level} (giá ${next_tap_price})`
      );
      balance -= next_tap_price;
    }
  }
}

export const getWallet = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get("/wallet/getWallet", { headers });

  return response.data.data;
};

export const linkWallet = async (
  secret,
  token,
  friendlyAddress,
  publicKey,
  rawAddress
) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const payload = {
    friendlyAddress,
    publicKey,
    rawAddress,
    walletType: 1,
  };

  const response = await secret.client.post("/wallet/bind", payload, {
    headers,
  });

  if (response.data.code != 0) throw new Error(response.data.message);
  return response.data;
};

export const linkBinanceWallet = (
  secret,
  token,
  friendlyAddress,
  publicKey,
  rawAddress
) =>
  linkExchangeWallet(secret, token, friendlyAddress, publicKey, rawAddress, 4);

export const linkBitgetWallet = (
  secret,
  token,
  friendlyAddress,
  publicKey,
  rawAddress
) =>
  linkExchangeWallet(secret, token, friendlyAddress, publicKey, rawAddress, 3);

export const linkOkxWallet = (
  secret,
  token,
  friendlyAddress,
  publicKey,
  rawAddress
) =>
  linkExchangeWallet(secret, token, friendlyAddress, publicKey, rawAddress, 2);

export const linkExchangeWallet = async (
  secret,
  token,
  friendlyAddress,
  publicKey,
  rawAddress,
  walletType
) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const payload = {
    friendlyAddress,
    publicKey,
    rawAddress,
    walletType,
  };

  const response = await secret.client.post("/wallet/bindOkx", payload, {
    headers,
  });

  return response.data;
};

export const unlinkWallet = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post("/wallet/unbind", null, {
    headers,
  });

  return response.data;
};

export const getMySquad = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get("/squad/mySquad", { headers });

  return response.data.data;
};

export const leaveSquad = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    "/squad/leaveSquad",
    {},
    {
      headers,
    }
  );

  return response.data;
};

export const joinSquad = async (secret, token, squadLink) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    "/squad/joinSquad",
    {
      squadTgLink: squadLink,
    },
    { headers }
  );

  return response.data.data;
};

export const getYespacBonus = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get("/game/getOfflineYesPacBonusInfo", {
    headers,
  });

  return response.data.data?.find?.(({ claimType }) => claimType == 1);
};

export const claimYespacBonus = async (
  secret,
  token,
  walletAddress,
  transactionId
) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    "/game/claimOfflineBonus",
    {
      claimType: 1,
      createAt: parseInt((new Date().getTime() / 1000).toFixed(0)),
      destination: walletAddress,
      id: transactionId,
    },
    { headers }
  );

  return response.data.data?.collectAmount;
};

export const offline = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post("/user/offline", null, { headers });

  return response.data;
};

export const turnOnYespac = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    "/build/toggleSwipeBotSwitch",
    "true",
    {
      headers,
    }
  );

  return response.data;
};

export const getSkinList = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get("/skin/getSkinList", {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);
  return response.data.data;
};

export const getSkinTasks = async (secret, token, skinId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(
    `/task/getCryptocurrencyExchangeTaskList?skinId=${skinId}`,
    {
      headers,
    }
  );
  if (response.data.code != 0) throw new Error(response.data.message);
  return response.data.data;
};

export const finishSkinTask = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    `/task/finishCryptocurrencyExchangeTask`,
    `${taskId}`,
    {
      headers,
    }
  );
  return response.data;
};

export const claimSkin = async (secret, token, skinId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    `/skin/update`,
    { skinId, skinStatus: 1 },
    {
      headers,
    }
  );
  return response.data;
};

export const getCommonTasks = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/task/getCommonTaskList`, {
    headers,
  });

  return response.data.data;
};

export const getTaskList = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/task/getTaskList`, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);
  const { specialTaskList, taskList } = response.data.data;

  return [...specialTaskList, ...taskList];
};

export const getDailyTasks = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/mission/getDailyMission`, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data.data;
};

export const clickDailyTask = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    `/mission/clickDailyMission`,
    taskId,
    {
      headers,
    }
  );
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data;
};

export const checkDailyTask = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    `/mission/checkDailyMission`,
    taskId,
    {
      headers,
    }
  );

  return response.data.data;
};

export const claimDailyTaskReward = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(`/mission/claimReward`, taskId, {
    headers,
  });

  return response.data.data;
};

export const finishCommonTask = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(`/task/finishTask`, `${taskId}`, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data;
};

export const getUpgradeTasks = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/task/getUserUpgradeTaskList`, {
    headers,
  });

  return response.data.data;
};

export const finishUpgradeTask = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    `/task/finishUserUpgradeTask`,
    `${taskId}`,
    {
      headers,
    }
  );
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data;
};

export const getTaskBonus = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/task/getFinishTaskBonusInfo`, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data.data;
};

export const claimTaskBonus = async (secret, token, bonusId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(`/task/claimBonus`, bonusId, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data;
};

export const clickTask = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(`/task/clickTask`, taskId, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data;
};

export const checkTask = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(`/task/checkTask`, taskId, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data;
};

export const claimTaskReward = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(`/task/claimTaskReward`, taskId, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data;
};

export const getInviteTasks = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/task/getInviteTaskList`, {
    headers,
  });

  return response.data.data;
};

export const claimInviteTask = async (secret, token, taskId) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(`/task/finishInviteTask`, taskId, {
    headers,
  });
  if (response.data.message == "user invite count not enough") return false;
  if (response.data.code != 0) throw new Error(response.data.message);

  return response.data;
};

export const claimCommonTaskBonus = async (secret, token) =>
  await claimTaskBonus(secret, token, 2);
export const claimDailyTaskBonus = async (secret, token) =>
  await claimTaskBonus(secret, token, 1);

export const getSignInTasks = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/signIn/list`, {
    headers,
  });

  return response.data.data;
};

export const getDailyPost = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/operation/dailyPost`, {
    headers,
  });

  return response.data;
};

export const claimSignInTask = async (secret, token, walletAddress, taskId) => {
  const reqBody = {
    signInType: 1,
    createAt: parseInt((new Date().getTime() / 1000).toFixed(0)),
    destination: walletAddress,
    id: taskId,
  };
  const abc = "6863b339db454f5bbd42ffb5b5ac9841";
  const sign = md5(taskId + reqBody.createAt + abc + reqBody.signInType);
  const headers = {
    ...commonHeaders,
    Token: token,
    tm: reqBody.createAt,
    sign,
  };
  const response = await secret.client.post(`/signIn/claim`, reqBody, {
    headers,
  });

  return response.data;
};

export const getRefCode = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/invite/getInviteGiftBoxInfo`, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);
  const { totalRecords } = await getFriendList(secret, token);
  const { inviteCode } = response.data.data;
  return { totalRecords, inviteCode };
};

export const getFriendList = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(
    `/invite/getInvitedUserList?index=1&totalPage=1&pageSize=1&bindWalletType=0`,
    {
      headers,
    }
  );
  if (response.data.code != 0) throw new Error(response.data.message);
  return response.data.data;
};

export const isInvited = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/user/info`, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);
  return response.data.data.isInvited;
};

export const bindInvite = async (secret, token, inviteCode = "r1Zu3m") => {
  const invited = await isInvited(secret, token);
  if (invited) {
    secret.log("User already invited");
    return false;
  }
  secret.log(`Bind user with invite code ${inviteCode}`);
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(
    `/invite/claimGiftBox?packId=${inviteCode}`,
    null,
    {
      headers,
    }
  );
  if (response.data.code != 0) throw new Error(response.data.message);
  return response.data.data;
};

export const getStatistics = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/user/statistics`, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);
  return response.data.data;
};

// {
//   "canClaimBonus": true,
//   "bonusAmount": 282420
// }
export const getStopBonus = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.get(`/account/getUserStopBonus`, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);
  return response.data.data;
};

export const claimStopBonus = async (secret, token) => {
  const headers = {
    ...commonHeaders,
    Token: token,
  };

  const response = await secret.client.post(`/account/claimStopBonus`, {}, {
    headers,
  });
  if (response.data.code != 0) throw new Error(response.data.message);
  return response.data.data;
};

// //
// async function main(stt, account, axios) {
//   try {
//     let urlData = querystring
//       .unescape(account)
//       .split("tgWebAppData=")[1]
//       .split("&tgWebAppVersion")[0];

//     let access_token = await login(stt, urlData, axios);
//     if (access_token) {
//       await getAccountInfo(stt, access_token, axios);
//       if (claimOriginal) {
//         // auto claim
//         await claim(stt, access_token, axios);
//       }

//       let boosts_info = await getAccountBuildInfo(stt, access_token, axios);

//       if (apply_daily_energy) {
//         const gameInfo = await getGameInfo(stt, access_token, axios);

//         if (
//           boosts_info.coinPoolLeftRecoveryCount > 0 &&
//           gameInfo.coinPoolLeftCount < 100
//         ) {
//           console.log(
//             `[#] Account ${stt} | Sleep 5s before activating the daily energy boost`
//           );
//           await sleep(5);
//           await applyEnergyBoost(stt, access_token, axios);
//           await sleep(1);
//           await claim(stt, access_token, axios);
//         } else {
//           await claim(stt, access_token, axios);
//         }
//       }

//       if (apply_daily_turbo) {
//         if (boosts_info.specialBoxLeftRecoveryCount > 0) {
//           console.log(
//             `[#] Account ${stt} | Sleep 5s before activating the daily turbo boost`
//           );
//           await sleep(5);

//           await applyTurboBoost(stt, access_token, axios);
//           await sleep(1);

//           await sendTapsWithTurbo(stt, access_token, axios);
//         }
//       }

//       if (autoUpgrade) {
//         await autoUpgradeAll(stt, access_token, axios);
//       }

//       console.log(cyan.bold(`[#] Account ${stt} | Done!`));
//     }
//   } catch (e) {
//     console.log(`Main Err: ${e}`);
//   }
// }

// // end main
