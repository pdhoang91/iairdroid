import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import CryptoJS from "crypto-js"
import { parseTgUserFromInitParams } from "./helper.js";

const commonHeaders = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9,vi;q=0.8",
  "content-type": "application/json",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"macOS\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "Referer": "https://memeverse.site/",
  "Referrer-Policy": "strict-origin-when-cross-origin"
}

export const newMemelandTgClientWithProxy = (
  proxy,
  log = console.log
) => {
  const param = {
    baseURL: "https://memeverse.site/api",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

export async function login(secret) {
  const response = await secret.client.post(
    `/auth/auth-by-telegram-webapp`,
    {
      tg_data: secret.privateKey,
    },
    { headers: commonHeaders }
  );

  return response.data.access_token;
}

export async function getProfile(secret, token) {
  const response = await secret.client.get(
    `/v1/user/profile`,
    { headers: { ...commonHeaders, authorization: `Bearer ${token}` } }
  );

  return response.data;
}

export async function register(secret, token, inviteLink = "1256279535") {
  try {
    return await getProfile(secret, token);
  } catch (e) {
    if (e?.response?.status != 404) throw e
  }
  const { id, first_name, username } = parseTgUserFromInitParams(secret.privateKey)
  secret.log(`Đăng kí tài khoản cho ${first_name} (id=${id})`);
  await secret.client.post(
    `/v1/accounts/register`,
    {
      telegram_id: getUserId(token),
      first_name,
      username,
      is_premium: true,
      invited: inviteLink
    },
    { headers: { ...commonHeaders, authorization: `Bearer ${token}`, code: genCode(`${getUserId(token)}`) } }
  );
  secret.log(`Đăng ký tài khoản thành công!`)
  return await getProfile(secret, token);
}

export async function getFarming(secret, token) {
  const { farming } = await getProfile(secret, token)
  return farming
}

export async function getDoneTasks(secret, token) {
  const { tasks } = await getProfile(secret, token)
  return tasks
}

export const getCoinList = () => ["bome", "bonk", "brett", "doge", "dogs", "floki", "meme", "pepe", "shib", "wif", "nott"];
export const getConversionRate = (coinName) => {
  const rate = { "doge": 0.1, bonk: 1000 }
  if (coinName in rate) {
    return rate[coinName]
  }
  return 1
}

export async function getCoinBalance(secret, token) {
  const { bome, bonk, brett, doge, dogs, floki, meme, pepe, shib, wif, nott } = await getProfile(secret, token);
  const priceObj = { bome, bonk, brett, doge, dogs, floki, meme, pepe, shib, wif, "not": nott }
  // const coinPrice = await getCoinPrice(secret, token);
  return Object.keys(priceObj).map(key => ({
    name: key,
    balance: parseFloat(priceObj[key]),
    // marketPrice: coinPrice[key.toUpperCase()]
  }))
}

export async function startFarming(secret, token) {
  const response = await secret.client.put(
    `/v1/farming/start`,
    {},
    { headers: { ...commonHeaders, authorization: `Bearer ${token}` } }
  );

  return response.data.access_token;
}

export async function claimFarming(secret, token) {
  const response = await secret.client.put(
    `/v1/farming/claim`,
    {},
    { headers: { ...commonHeaders, authorization: `Bearer ${token}` } }
  );

  return response.data.access_token;
}

export async function getCoinPrice(secret, token) {
  const response = await secret.client.get(
    `/v1/transfers/price_for_fiat/all`,
    { headers: { ...commonHeaders, authorization: `Bearer ${token}` } }
  );

  return response.data.currencies;
}

export async function trade(secret, token, payCurrency, receiveCurrency, amount) {
  const response = await secret.client.put(
    `/v1/exchange/submit_exchange`,
    {
      "pay_currency": payCurrency,
      "receive_currency": receiveCurrency,
      "pay_amount": amount
    },
    { headers: { ...commonHeaders, authorization: `Bearer ${token}` } }
  );

  return response.data;
}

export async function claimTask(secret, token, taskId) {
  const response = await secret.client.put(
    `/v1/user/task/claim`,
    {
      item: taskId,
    },
    { headers: { ...commonHeaders, authorization: `Bearer ${token}` } }
  );

  return response.data;
}

const genCode = (string) => {
  const iv = CryptoJS.lib.WordArray.random(16)
  // const iv = CryptoJS.lib.WordArray.create(Buffer.from("4b02d99e470e1fa98d3d6ade8dd704bd", "hex"))
  const output = CryptoJS.AES.encrypt(string, CryptoJS.enc.Utf8.parse("12345678901234567890123456789012"), {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC
  });
  return iv.toString(CryptoJS.enc.Hex) + ":" + output.toString()
}

const decode = (cipher, ivStr) => {
  // const iv = CryptoJS.lib.WordArray.random(16)
  const iv = CryptoJS.lib.WordArray.create(Buffer.from(ivStr, "hex"))
  const origin = CryptoJS.AES.decrypt(cipher, CryptoJS.enc.Utf8.parse("12345678901234567890123456789012"), {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC
  });
  return atob(origin.toString(CryptoJS.enc.Base64))
}

const getUserId = (token) => {
  const body = JSON.parse(atob(token.split(".")[1]))
  return body.sub;
}

export async function tap(secret, token, coinName, amount) {
  amount = (amount / 1000).toFixed(3)
  const body = {
    [coinName]: `${(amount * getConversionRate(coinName)).toFixed(3)}`,
    score: `${amount}`,
  }
  const code = genCode(`${getUserId(token)}-${body.score}`);
  const response = await secret.client.put(
    `/v1/user/balance`,
    body,
    { headers: { ...commonHeaders, authorization: `Bearer ${token}`, code } }
  );

  return response.data;
}

export const taskConfig = {
  okx_welcome_bonus: {
    price: "500",
    navigation: "okx_welcome_bonus",
    link: "/challenge/okx_welcome_bonus",
    social: "challenge",
    task: "active",
  },
  bingx_welcome_bonus: {
    price: "500",
    navigation: "bingx_welcome_bonus",
    link: "/challenge/bingx_welcome_bonus",
    social: "challenge",
    task: "active",
  },
  freepavel: {
    price: "50",
    navigation: "freepavel",
    link: "https://t.me/freepavelforever",
    social: "tg_extra",
    task: "active",
  },
  memefi: {
    price: "50",
    navigation: "memefi",
    link: "https://t.me/memefi_coin_bot?start=r_3b1dc196d9",
    social: "tg",
    task: "active",
  },
  timefarm_bot: {
    price: "50",
    navigation: "timefarm_bot",
    link: "https://t.me/TimeFarmCryptoBot?start=PvefSDIbBHNNPLfK",
    social: "tg",
    task: "active",
  },
  tapcoin_bot: {
    price: "100",
    navigation: "tapcoin_bot",
    link: "/challenge/tapcoin_bot",
    social: "challenge",
    task: "active",
  },
  bump: {
    price: "100",
    navigation: "bump",
    link: "/challenge/bump",
    social: "challenge",
    task: "active",
  },
  hexn_bot: {
    price: "100",
    navigation: "hexn_bot",
    link: "/challenge/hexn_bot",
    social: "challenge",
    task: "active",
  },
  seed_bot: {
    price: "100",
    navigation: "seed_bot",
    link: "/challenge/seed_bot",
    social: "challenge",
    task: "active",
  },
  channel: {
    price: "150",
    navigation: "channel",
    link: "https://t.me/themetaland",
    social: "tg_extra",
    task: "active",
  },
  meme_fam: {
    price: "50",
    navigation: "meme_fam",
    link: "https://t.me/memeverse_fam",
    social: "tg",
    task: "active",
  },
  twitter: {
    price: "50",
    navigation: "twitter",
    link: "https://x.com/memeland_tg",
    social: "other",
    task: "active",
  },
  instagram: {
    price: "50",
    navigation: "instagram",
    link: "https://www.instagram.com/memeland_tg",
    social: "other",
    task: "active",
  },
  memeverse: {
    price: "50",
    navigation: "memeverse",
    link: "/memeverse",
    social: "app",
    task: "active",
  },
  wallet: {
    price: "50",
    navigation: "wallet",
    link: "",
    social: "connect",
    task: "active",
  },
  youtube: {
    price: "100",
    navigation: "youtube",
    link: "https://www.youtube.com/@thememeland_tg",
    social: "other",
    task: "active",
  },
  frens: {
    price: "250",
    navigation: "frens",
    link: "",
    social: "",
    task: "active",
  },
  frens_h: {
    price: "2,500",
    navigation: "frens_h",
    link: "",
    social: "",
    task: "active",
  },
  frens_t: {
    price: "25,000",
    navigation: "frens_t",
    link: "",
    social: "",
    task: "active",
  },
  frens_tt: {
    price: "250,000",
    navigation: "frens_tt",
    link: "",
    social: "",
    task: "active",
  },
  earlier_users: {
    price: "1000",
    navigation: "earlier_users",
    link: "",
    social: "",
    task: "ended",
  },
  register: {
    price: "0",
    navigation: "register",
    link: "",
    social: "",
    task: "ended",
  }
}