import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

const commonHeaders = {
  'accept': '*/*',
  'accept-language': 'vi',
  'cache-control': 'no-cache',
  'origin': 'https://djdog.io',
  'pragma': 'no-cache',
  'priority': 'u=1, i',
  'referer': 'https://djdog.io/',
  'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Microsoft Edge";v="126"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
}

export const newDJDogClientWithProxy = (
  proxy,
  log = console.log
) => {
  const param = {
    baseURL: "https://api.djdog.io",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
    log(`Tạo djdog client với proxy ${ip}:${port}`);
  }
  return axios.create(param);
};

export async function login(secret) {
  const payload = secret.privateKey;
  const response = await secret.client.get(
    `/telegram/login?${payload}`,
    { headers: commonHeaders }
  );

  if (response.data?.returnCode != 200) throw new Error(response.data?.returnDesc)
  if (response && response.status == 200) {
    return {
      access_token: response.data?.data?.accessToken,
      data: response.data?.data?.refreshToken,
    };
  } else {
    throw new Error(`login err: ${response.data?.data?.returnDesc}`);
  }
}

export async function getPetInfo(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }
  const response = await secret.client.get(
    `/pet/information`,
    { headers: headers }
  );

  return response.data.data;
}

export async function startAdopt(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }
  const response = await secret.client.post(
    `/pet/adopt`,
    {},
    { headers: headers }
  );
  return response.data;
}

export async function getBarAmount(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }
  try {
    const response = await secret.client.get(
      `/pet/barAmount`,
      { headers: headers }
    );

    if (response && response.status == 200) {
      return response.data.data;
    }
  } catch (e) {
    throw new Error(`getBarAmount err: ${e}`);
  }
}

export async function getBoxData(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }
  const response = await secret.client.get(
    `/pet/boxMall`,
    { headers: headers }
  );
  return response.data?.data
}

export async function collect(secret, token, count, collectAll = false) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }
  if (collectAll) {
    count = 0;
  }
  const response = await secret.client.post(
    `/pet/collect?clicks=${count}`,
    {},
    { headers: headers }
  );

  if (response && response.status == 200) {
    const { returnCode, returnDesc } = response.data;
    if (returnCode != 200) {
      throw new Error(returnDesc)
    }
    if (collectAll) {
      secret.log(`Claim hết coin`);
    } else {
      secret.log(`Claim ${count} coin`);
    }
    return;
  }
}

export async function upMaxLevel(secret, token, maxLv = 40) {
  let { goldAmount } = await getBarAmount(secret, token);
  let { level, levelUpAmount } = await getBoxData(secret, token);
  let upLvl = 0;
  while (level < maxLv && goldAmount >= levelUpAmount) {
    secret.log(`(Balance=${goldAmount}) Nâng cấp lên lv ${level + 1} (${levelUpAmount})`)
    await upLevel(secret, token)
    let boxData = await getBoxData(secret, token);
    goldAmount -= levelUpAmount;
    level = boxData.level;
    levelUpAmount = boxData.levelUpAmount;
    upLvl++;
  }
  return upLvl;
}

export async function upLevel(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }
  try {
    const response = await secret.client.post(
      `/pet/levelUp/0`,
      {},
      { headers: headers }
    );

    if (response && response.status == 200) {
      const { returnCode, returnDesc } = response.data;
      if (returnCode != 200) {
        throw new Error(returnDesc)
      }
      return;
    }
  } catch (e) {
    throw new Error(`upMaxLevel err: ${e}`);
  }
}

export async function getUserInfo(secret, token, address) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.get(
    `/userCenter/information`,
    { headers: headers }
  );

  return response.data.data;
}

export async function bindAddress(secret, token, address) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.post(
    `/mission/bindTon`,
    null,
    {
      params: { address },
      headers: headers,
    }
  );

  const result = response.data
  if (result.returnCode != 200) throw new Error(result.returnDesc)
  return result;
}

export async function buyBox(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.post(
    `/pet/exchangeBox/0`,
    null,
    {
      headers: headers,
    }
  );

  const result = response.data
  if (result.returnCode != 200) throw new Error(result.returnDesc)
  return result;
}

export async function getGroupMissions(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.get(
    `/mission/group`,
    {
      headers: headers,
    }
  );

  return response.data.data;
}

export async function finishTask(secret, token, taskId) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.post(
    `/mission/finish?id=${taskId}`,
    null,
    {
      headers: headers,
    }
  );

  return response.data;
}

export async function getWalkFindsMissions(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.get(
    `/mission/walkFinds`,
    {
      headers: headers,
    }
  );

  return response.data.data?.missionRows || [];
}

export async function getPartnerMissions(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.get(
    `/mission/partners`,
    {
      headers: headers,
    }
  );

  return response.data.data?.missionRows || [];
}

export async function getInfoMissions(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.get(
    `/mission/fixMissionInfo`,
    {
      headers: headers,
    }
  );

  return response.data.data;
}

export async function finishFixTask(secret, token, taskType) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.post(
    `/mission/finishFix?fixTaskType=${taskType}`,
    null,
    {
      headers: headers,
    }
  );

  return response.data;
}

export async function getSummaryMissions(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.get(
    `/task/summary`,
    {
      headers: headers,
    }
  );

  return response.data.data?.summaryRows;
}

export async function getGroup1Missions(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.get(
    `/task/list?taskGroup=1`,
    {
      headers: headers,
    }
  );

  return response.data.data?.taskDetails || [];
}

export async function finishGroup1Task(secret, token, taskId) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.post(
    `/task/finish?taskIds=${taskId}`,
    null,
    {
      headers: headers,
    }
  );

  return response.data;
}

export async function getDailyMissions(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.get(
    `/check/in/user/list`,
    {
      headers: headers,
    }
  );

  return response.data.data || [];
}

export async function finishDailyTask(secret, token, taskId) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.post(
    `/check/in?id=${taskId}`,
    {id: taskId},
    {
      headers: headers,
    }
  );

  return response.data;
}

export async function bindHskID(secret, token, hskID) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.post(
    `/hskWithdraw/bingUid`,
    { uid: hskID },
    {
      headers: headers,
    }
  );
  if (response.data?.returnCode != 200) throw new Error(response.data?.returnDesc);

  return response.data;
}

// {
//   "hskAmount": "1",
//   "uid": "1667536507786081792",
//   "uidStatus": 1,
//   "withdrawAble": false,
//   "requirements": [
//     "The $HSK Rewards will be settled <b>every Friday</b>.",
//     "Each DJDog account can only be bound to one UID.",
//     "The withdrawal limit is capped ad 100 $HSK.",
//     "Withdrawal will clear you Eligible $HSK within the limit at once.",
//     "Unlocking $HSK need to meet the business partners requirements."
//   ]
// }
export async function getHskID(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: token,
  }

  const response = await secret.client.get(
    `/hskWithdraw/uidInfo`,
    {
      headers: headers,
    }
  );
  if (response.data?.returnCode != 200) throw new Error(response.data?.returnDesc);

  const hskData = response.data?.data;
  return {
    hskAmount: parseFloat(hskData?.hskAmount || 0),
    uid: hskData?.uid,
    uidStatus: hskData?.uidStatus,
    withdrawAble: hskData?.withdrawAble,
  };
}

export const calculateExpectedBox = (level) => {
  let expectedBox = level - 40 + 1;
  if (level >= 50) expectedBox += 10;
  if (level >= 55) expectedBox += 20;
  if (level >= 60) expectedBox += 40;
  if (level >= 65) expectedBox += 60;
  if (level >= 70) expectedBox += 80;
  if (level >= 75) expectedBox += 100;
  if (level >= 80) expectedBox += 1000;
  if (level >= 85) expectedBox += 2000;
  if (level >= 90) expectedBox += 4000;
  return expectedBox;
}

export const calculateMaxLevel = (autoMaxLevel, boxAmount, level) => {
  if (level >= 50) boxAmount -= 10;
  if (level >= 55) boxAmount -= 20;
  if (level >= 60) boxAmount -= 40;
  if (level >= 65) boxAmount -= 60;
  if (level >= 70) boxAmount -= 80;
  if (level >= 75) boxAmount -= 100;
  if (level >= 80) boxAmount -= 1000;
  if (level >= 85) boxAmount -= 2000;
  if (level >= 90) boxAmount -= 4000;
  let maxLevel = autoMaxLevel + boxAmount + 1;
  return maxLevel;
}