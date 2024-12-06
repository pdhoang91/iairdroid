import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export const newSpellClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://wallet-api.spell.club",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://wallet-api.spell.club",
      Referer: "https://wallet-api.spell.club/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

const axiosClient = newSpellClientWithProxy();

export const getSpellUser = async (sender) => {
  const client = sender.client || axiosClient;
  const res = await client.get("/user", {
    headers: {
      Authorization: "tma " + sender.privateKey,
    },
  });
  return res.data;
};

export const getTask = async (sender) => {
  const client = sender.client || axiosClient;
  const res = await client.post("/get_tasks", null, {
    headers: {
      Authorization: "tma " + sender.privateKey,
    },
  });
  return res.data;
};

export const isTaskDone = async (sender, taskId) => {
  const tasks = await getTask(sender);
  const task = tasks?.find?.(({ id }) => id == taskId);
  return !task;
};

export const waitUntilTaskDone = async (sender, taskId) => {
  while (true) {
    const done = await isTaskDone(sender, taskId);
    if (done) return;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

export const claimSpellBatchMode = async (sender) => {
  const client = sender.client || axiosClient;
  const res = await client.post("/claim", null, {
    headers: {
      Authorization: "tma " + sender.privateKey,
    },
  });
  return res.data;
};

export const upgradeMagic = async (sender) => {
  const client = sender.client || axiosClient;
  const res = await client.post(
    "/upgrade?batch_mode=true",
    {
      upgrade_type: "magic",
    },
    {
      headers: {
        Authorization: "tma " + sender.privateKey,
      },
    }
  );
  return res.data;
};

export const upgradeBoost = async (sender) => {
  const client = sender.client || axiosClient;
  const res = await client.post(
    "/upgrade?batch_mode=true",
    {
      upgrade_type: "booster",
    },
    {
      headers: {
        Authorization: "tma " + sender.privateKey,
      },
    }
  );
  return res.data;
};

export const getSpellSetting = async (sender) => {
  const client = sender.client || axiosClient;
  const res = await client.get("/config", {
    headers: {
      Authorization: "tma " + sender.privateKey,
    },
  });
  return res.data;
};

export const isSpellClaimable = async (secret) => {
  let {
    magic_lvl: magic,
    booster_lvl: booster,
    last_claim_time: latestClaimTime,
    reward_per_minute: rewardPerMinute,
    magic_capacity: maxReward,
  } = await getSpellUser(secret);
  let claimable = false;
  latestClaimTime = new Date(latestClaimTime * 1000);
  let nextClaimTime =
    new Date(latestClaimTime.getTime() + (maxReward / rewardPerMinute).toFixed(0) * 60_000);
  if (new Date() > nextClaimTime) {
    claimable = true;
  }
  let timeToFullCapacity = 0;
  if (!claimable) {
    timeToFullCapacity = nextClaimTime - new Date();
  }
  return {
    claimable,
    nextClaimTime,
    maxReward,
    rewardPerMinute,
    magicLvl: magic,
    boosterLvl: booster,
    timeToFullCapacity,
  };
};
