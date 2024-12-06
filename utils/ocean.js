import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getJwtBody, getTokenExpirationDate, parseTgUserFromInitParams } from "./helper.js";
import { getItemObj, removeItem, setItem } from "../config/network.js";
import { v4 as uuidv4 } from 'uuid';
import { getAccountLevelAndMultipleKey } from "./balance-ocean.js";
import { newSemaphore } from "./semaphore.js";

const commonHeaders = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9,vi;q=0.8",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "Referer": "https://walletapp.waveonsui.com/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
};

export const newOceanClientWithProxy = (proxy, log = console.log) => {
    const param = {
        baseURL: "https://api-walletapp.waveonsui.com/api",
        headers: { ...commonHeaders },
    };
    if (proxy) {
        const { user, passsword, ip, port } = proxy;
        const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
        param.httpsAgent = new HttpsProxyAgent(proxyStr);
    }
    return axios.create(param);
};

const loginKey = (address, tgId) => `ocean_login_v1_${address}_${tgId}`;
// {
//   "address": "0x17ef16365ce3cdc1ecc9d3bc4446e43a59da65d5c50ac7a29238c53b11a3f3d3",
//   "signature": "AIr9IVafvSyd/72at00ulKJgWM07Ny1cxN2LSCPCj9XFVJMw8jqnmoFZ5zGP7BjhTg8GsY4UxuYoho7oQkMMaQXKYMh8EfmQWzOEufx9uMuc9o3TO5EhCJVooJ1zFFSTEg==",
//   "telegramData": "query_id=AAHvTeFKAAAAAO9N4Ur30jHA&user=%7B%22id%22%3A1256279535%2C%22first_name%22%3A%22Steve%22%2C%22last_name%22%3A%22Le%22%2C%22username%22%3A%22steven_le_28%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1727938099&hash=69b70b3cfc002d71c5069e734256655ba4bcee389493839e1c6a67bfe5336ace",
//   "deviceId": "df8d3a2a-10f4-4d08-b70d-6118c446775e"
// }
// response: {
//   "access_token": ""
// }
export async function login(secret) {
    const { id } = parseTgUserFromInitParams(secret.initParams);
    const data = getItemObj(loginKey(secret.address, id))
    if (data) {
        secret.token = data.token;
        secret.deviceId = data.deviceId;
        return data.token;
    }
    const signature = (await secret.keyPair().signPersonalMessage(Buffer.from(`${id}`))).signature;
    const deviceId = uuidv4();
    const response = await secret.client.post(`/wallet/add`, {
        "address": secret.address,
        "signature": signature.toString(),
        "telegramData": secret.initParams,
        "deviceId": deviceId,
    }, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    setItem(loginKey(secret.address, id), { token: response.data.access_token, deviceId }, 6 * 30 * 24 * 60 * 60_000)
    secret.token = response.data.access_token;
    secret.deviceId = deviceId;
    return response.data.access_token;
}

const loginMemeCultureKey = (id) => `ocean_mc_login_v1_${id}`;
export async function loginMemeCulture(secret, refId = 1741596) {
    const { id } = parseTgUserFromInitParams(secret.initParams);
    const data = getItemObj(loginMemeCultureKey(id))
    if (data) {
        secret.mc_token = data.token;
        return data.token;
    }
    const response = await secret.client.post(`/tb/login`, {
        "telegramData": secret.initParams,
        "refId": refId
    }, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    setItem(loginMemeCultureKey(id), { token: response.data.access_token }, getTokenExpirationDate(response.data.access_token) - new Date())
    secret.mc_token = response.data.access_token;
    return response.data.access_token;
}

export async function getFreeSpinTicket(secret) {
    try {
        return await submitTaskSpin(secret, 1)
    } catch(e) {
        if (e?.response?.status == 400) {
            secret.log("Không thể nhận vé free")
            return
        }
        throw e;
    }
    
}

// SUCCESS: {
//   "result": "succeeded"
// }
// FAIL: {
//   "result": "failed",
//   "message": "You haven’t invited anyone today. Invite a friend for an extra ticket!"
// }
export async function submitTaskSpin(secret, taskId) {
    const response = await secret.client.post(`/wave-spin/task/${taskId}/submit`, null, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

// {
//   "id": 397234,
//   "created_at": "2024-10-03T06:35:19.820Z",
//   "updated_at": "2024-10-03T06:35:19.820Z",
//   "deleted_at": null,
//   "wallet_address": "0x0f16411d5ccbe53e6c3335ed7d6753bac48704c16d0e3d137b2df6f7510ce3d9",
//   "spin_id": 2,
//   "buy_quantity": 1,
//   "open_quantity": 0,
//   "remain_buy": 10,
//   "remain_open": 12
// }
export async function getSpin(secret, spinId = 2) {
    const response = await secret.client.get(`/wave-spin/${spinId}/my-ticket`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

export async function isDailySpinClaimed(secret) {
    const { spin_tasks } = await getDailyWheelConfig(secret)
    return spin_tasks.find(({ code, status }) => code == "DAILY_BONUS" && status == 1)
}

// [
//   {
//     "id": 11660727,
//     "amount": "10",
//     "item": {
//       "id": 10,
//       "name": "Point",
//       "image": null,
//       "description": null,
//       "type": 4,
//       "decimals": null,
//       "type_name": null
//     },
//     "status": 2,
//     "wallet_address": "0x0f16411d5ccbe53e6c3335ed7d6753bac48704c16d0e3d137b2df6f7510ce3d9",
//     "spin_id": 2,
//     "spin_reward_id": 31,
//     "tx_digest": null
//   }
// ]
export async function openSpinTicket(secret, amount = 1, spinId = 2) {
    const response = await secret.client.post(`/wave-spin/open`, { amount, spinId }, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

export async function getSpinConfig(secret) {
    const response = await secret.client.get(`/wave-spin/spins`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

export async function getMySquad(secret) {
    const response = await secret.client.get(`/squad/my-squad`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

// {
//     "id": 678,
//     "name": "AirDrop Vietnam 💰💰💰",
//     "username": "clgroup1",
//     "type": "supergroup",
//     "description": "Airdrop community in Vietnam",
//     "owner": 1741596,
//     "image_url": "https://file-walletapp.waveonsui.com/images/squads/avatars/4bfb9833-0c9a-4321-9e11-596c56c7ac00.jpg",
//     "total_member": 4444,
//     "trading_volume": 0,
//     "last_update": "2024-10-29",
//     "trading_volume24h": 0,
//     "code_squad": "0tg8ty"
//   }
export async function getSquadById(secret, squadId) {
    const response = await secret.client.get(`/squad/${squadId}`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

const squadDailyCode = (squadId) => `ocean_squadCode_v2_${squadId}`;
const {exec: squadExec} = newSemaphore();
export async function getMySquadCode(secret, mySquad) {
    if (!mySquad) {
        mySquad = await getMySquad(secret);
    }
    if (!mySquad) throw new Error("not joined squad");
    return await squadExec(async() => {
        let squadCode = getItemObj(squadDailyCode(mySquad.id))
        if (squadCode) return squadCode;
        secret.log(`Getting code of squad ${mySquad.name}`)
        const { code_squad } = await getSquadById(secret, mySquad.id)
        setItem(squadDailyCode(mySquad.id), code_squad, 2 * 60 * 60_000);
        return code_squad;
    })
}

export async function joinSquad(secret, squadId, refId) {
    const response = await secret.client.post(`/squad/join`, { squadId, refId }, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

export async function leaveSquad(secret) {
    const response = await secret.client.post(`/squad/join`, null, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

// [
//   {
//     "completed": true,
//     "wallet_id": 3133422,
//     "mission_code": "REFERENCE",
//     "prize_type": "UP_MISSION_LEVEL"
//   }
// ]
export async function getCompletedMissions(secret) {
    const response = await secret.client.get(`/mission/completed`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

export async function isRefMissionCompleted(secret) {
    const missions = await getCompletedMissions(secret);
    return missions.find(({ mission_code, completed }) => mission_code == "REFERENCE" && completed);
}

// {
//   "signature": "16Gp7i/3cKw9qb5DWvW8ufIl/YG1QmQHw8sixxdWH6fzi9WU9wZVrJN3US3AaVCT+4Kw2wOuRzdXsbyXNkFqDQ==",
//   "mission_id": 1
// }
export async function claimMissionSignature(secret) {
    const response = await secret.client.get(`/mission/claim-mission-signature`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

export async function updateRefferal(secret, refAddress) {
    const response = await secret.client.put(`/wallet/referal`, { refAddress }, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    console.log(response.data);
    return response.data;
}

// {
//   "reference": "succeeded",
//   "completed": false
// }
export async function isRefEnough(secret) {
    const response = await secret.client.get(`/mission/verify-reference`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

export async function getDailyWheelConfig(secret) {
    const configs = await getSpinConfig(secret);
    return configs.find(({ code }) => code == "DAILY_WHEEL");
}

export async function isClaimedFirstTime(secret) {
    const response = await secret.client.get(`/claim/info`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return (response.data.free_sponsor || 0) < 1;
}

export async function claimFirstTime(secret) {
    const response = await secret.client.post(`/claim`, {
        address: secret.address,
    }, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    removeItem(getAccountLevelAndMultipleKey(secret.address));
    return response.data;
}
// {
//   "id": 116321,
//   "point": "187.53595890375",
//   "wallet_address": "0x17ef16365ce3cdc1ecc9d3bc4446e43a59da65d5c50ac7a29238c53b11a3f3d3"
// }
export async function getPoint(secret) {
    const response = await secret.client.get(`/point`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

// [{
//  "first_name": ""
//  "last_name": ""
//  "wallet_address": "0x7a4c464e21f10bc4c34d564df33d8d6cd7eca4702a2668f09efba2e328e848af"
// }]
export async function getFriends(secret) {
    const response = await secret.client.get(`/wallet/friends`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.token}` } });
    return response.data;
}

// {
//   "balance": "105",
//   "wog_nft_holder": "0",
//   "wave_point_bonus": "5",
//   "new_user": "100",
//   "discord_role": "0",
//   "end_time": "2024-11-02T00:00:00.000Z"
// }
export async function getWeweBalance(secret) {
    const response = await secret.client.get(`/tb/wewe`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.mc_token}` } });
    return response.data;
}

// [{
//     "id": 13,
//     "code": "JOIN_SQUAD",
//     "name": "Join Squad",
//     "description": null,
//     "ordinal": 2,
//     "reward": 50,
//     "status": 0,
//     "params": {
//       "action": "OPEN",
//       "amount": 1
//     },
//     "children": [],
//     "photo_url": "https://file-walletapp.waveonsui.com/images/wewe/telegram.png",
//     "redirect_url": "SQUAD",
//     "need_submit": true,
//     "need_verify": true,
//     "start_time": null,
//     "end_time": null
//   }]
export async function getWeweTask(secret) {
    const response = await secret.client.get(`/wewe/task/available`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.mc_token}` } });
    return response.data;
}

export async function submitWeweTask(secret, taskId, answer) {
    try {
        const payload = {}
        if (answer) {
            payload.answer = answer;
        }
        const response = await secret.client.post(`/wewe/task/${taskId}/submit`, payload, { headers: { ...commonHeaders, authorization: `Bearer ${secret.mc_token}` } });
        if (response.data.result != "succeeded") throw new Error(response.data.message);
        return response.data;
    } catch(e) {
        if(e?.response?.status == 400 && e?.response?.data?.message?.includes?.("Due to high traffic")) {
            return e?.response?.data;
        }
        throw e;
    }   
}

// {
//   "volume": 0,
//   "point": 0,
//   "num_ref": 2,
//   "reward_balance": []
// }
export async function getUserStats(secret) {
    const response = await secret.client.get(`/tb/user/stats`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.mc_token}` } });
    return response.data;
}

export async function getRefCount(secret) {
    const {num_ref} = await getUserStats(secret)
    return num_ref;
}

// [
//   {
//     "id": 42765,
//     "address": "0xad45f405a63686835587710fe98dd32eae19ba70037faed726fb9823423f35c7",
//     "name": "Account",
//     "chain_id": 101,
//     "is_primary": true
//   },
//   {
//     "id": 66239,
//     "address": "0x17ef16365ce3cdc1ecc9d3bc4446e43a59da65d5c50ac7a29238c53b11a3f3d3",
//     "name": "Account",
//     "chain_id": 101,
//     "is_primary": false
//   }
// ]
export async function getWallets(secret) {
    const response = await secret.client.get(`/tb/wallets`, { headers: { ...commonHeaders, authorization: `Bearer ${secret.mc_token}` } });
    return response.data;
}

export async function getPrimaryWallet(secret, chainId = 101) {
    const wallets = await getWallets(secret);
    return wallets.find(({is_primary, chain_id}) => is_primary && chain_id == chainId);
}

// {
//     "address": "0xad45f405a63686835587710fe98dd32eae19ba70037faed726fb9823423f35c7",
//     "name": "Account",
//     "path": "m/44'/784'/0'/0'/0'",
//     "private_key": "",
//     "is_primary": true
//   }
export async function exportPrimaryWalletKey(secret, walletAddress) {
    const response = await secret.client.post(`/tb/wallets/export-key`, {walletAddress}, { headers: { ...commonHeaders, authorization: `Bearer ${secret.mc_token}` } });
    return response.data;
}

export function getRefId(secret) {
    if (!secret.token) return
    const { sub } = getJwtBody(secret.token)
    return sub;
}

export function getRefLink(secret) {
    return `https://t.me/waveonsuibot/walletapp?startapp=${getRefId(secret)}`;
}