import { JSONStringtify, getTokenExpirationDate, isTokenExpired, parseTgUserFromInitParams } from "./helper.js";
import { getItemObj, removeItem, setItem } from "../config/network.js";
import { generateTonProof } from "./balance-ton.js";
import { getBananaTurnstileToken } from "./capsolver.js";

const commonHeaders = {
  "Accept": "application/json, text/plain, */*",
  "Origin": "https://banana.carv.io",
  "Referer": "https://banana.carv.io/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "X-App-Id": "carv"
};

const loginKey = (id) => `banana_login_v1_${id}`;
export async function login(secret) {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  let token = getItemObj(loginKey(id));
  if (token) {
    if (!isTokenExpired(token)) {
      return token;
    } else {
      removeItem(loginKey(id));
    }
  }
  const loginPayload = {
    tgInfo: secret.privateKey,
    InviteCode: "",
  };

  const response = await secret.client.post(`https://interface.carv.io/banana/login`, loginPayload, {
    headers: { ...commonHeaders },
    withInterceptorIdHeader: true,
  });

  const responseData = response?.data;
  if (responseData?.data?.token) {
    const token = responseData.data.token;
    setItem(loginKey(id), token, getTokenExpirationDate(token) - new Date());
    return token;
  } else {
    throw new Error(`Không tìm thấy token: ${responseData?.msg || responseData?.detail || JSON.stringify(responseData)}`);
  }
}

export async function getUserInfo(secret, token) {
  const response = await secret.client.get(`https://interface.carv.io/banana/get_user_info`, {
    headers: { ...commonHeaders, Authorization: token },
    withInterceptorIdHeader: true,
  });
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

export async function claimQuestLottery(secret, token) {
  const response = await secret.client.post(
    `https://interface.carv.io/banana/claim_quest_lottery`,
    {},
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data;
}

export async function getBananaList(secret, token, pageNum = 1, pageSize = 20) {
  const response = await secret.client.get(`https://interface.carv.io/banana/get_banana_list/v2?page_num=${pageNum}&page_size=${pageSize}`, {
    headers: { ...commonHeaders, Authorization: token },
    withInterceptorIdHeader: true,
  });
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

export async function getFullBananaList(secret, token) {
  let result = [];
  let page = 0;
  while(true) {
    page += 1;
    let {list} = await getBananaList(secret, token, page);
    list?.filter(({count}) => count > 0).forEach((item) => result.push(item));
    if (list.find(({count}) => count == 0)) break
    if (list.length == 0) break
  }
  return result;
}

export async function getQuestList(secret, token, pageNum = 1, pageSize = 50) {
  const response = await secret.client.get(`https://interface.carv.io/banana/get_quest_list/v2?page_num=${pageNum}&page_size=${pageSize}`, {
    headers: { ...commonHeaders, Authorization: token },
    withInterceptorIdHeader: true,
  });
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data;
}

export async function equipBanana(secret, token, bananaId) {
  const equipPayload = { bananaId };
  const response = await secret.client.post(`https://interface.carv.io/banana/do_equip`, equipPayload, {
    headers: { ...commonHeaders, Authorization: token },
    withInterceptorIdHeader: true,
  });
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data;
}

export async function achieveQuest(secret, token, questId) {
  const achievePayload = { quest_id: questId };

  const response = await secret.client.post(`https://interface.carv.io/banana/achieve_quest`, achievePayload, {
    headers: { ...commonHeaders, Authorization: token },
    withInterceptorIdHeader: true,
  });
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data;
}

export async function claimQuest(secret, token, questId) {
  const claimPayload = { quest_id: questId };

  const response = await secret.client.post(`https://interface.carv.io/banana/claim_quest`, claimPayload, {
    headers: { ...commonHeaders, Authorization: token },
    withInterceptorIdHeader: true,
  });
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data;
}

export async function doClick(secret, token, clickCount) {
  const clickPayload = { clickCount: clickCount };

  const response = await secret.client.post(`https://interface.carv.io/banana/do_click`, clickPayload, {
    headers: { ...commonHeaders, Authorization: token },
    withInterceptorIdHeader: true,
  });
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data;
}

export async function getLotteryInfo(secret, token) {
  const response = await secret.client.get(`https://interface.carv.io/banana/get_lottery_info`, {
    headers: { ...commonHeaders, Authorization: token },
    withInterceptorIdHeader: true,
  });
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

export async function claimLottery(secret, token) {
  const claimPayload = { claimLotteryType: 1 };
  const response = await secret.client.post(`https://interface.carv.io/banana/claim_lottery`, claimPayload, {
    headers: { ...commonHeaders, Authorization: token },
    withInterceptorIdHeader: true,
  });
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data;
}

export async function doLottery(secret, token) {
  const response = await secret.client.post(
    `https://interface.carv.io/banana/do_lottery`,
    {},
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

export async function doShare(secret, token, bananaId) {
  const response = await secret.client.post(
    `https://interface.carv.io/banana/do_share`,
    { banana_id: bananaId },
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

export async function doSpeedup(secret, token) {
  const response = await secret.client.post(
    `https://interface.carv.io/banana/do_speedup`,
    {},
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

export async function callAdsgramApi(secret) {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  try {
    const response = await secret.client.get(
      `https://api.adsgram.ai/adv?blockId=2748&tg_id=${id}&tg_platform=tdesktop&platform=Win32&language=en&is_premium=true&chat_type=sender&chat_instance=-6089476818413932417`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Referer": "https://banana.carv.io/",
          "Origin": "https://banana.carv.io",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "*/*",
          "Cache-Control": "max-age=0",
          "Connection": "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Microsoft Edge";v="128", "Microsoft Edge WebView2";v="128"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"'
        },
      }
    );
    return response?.data;
  } catch(e) {
    return e?.response?.data
  }
}

// {
//     "code": 0,
//     "msg": "Success",
//     "data": {
//       "sell_got_usdt": 0.01,
//       "sell_got_peel": 330,
//       "usdt": 0.01,
//       "peel": 1780
//     }
//   }
export async function sellBanana(secret, token, bananaId, amount) {
  const response = await secret.client.post(
    `https://interface.carv.io/banana/do_sell`,
    {
      bananaId,
      sellCount: amount,
    },
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data;
}

export async function getAdsInfo(secret, token) {
  const response = await secret.client.get(
    `https://interface.carv.io/banana/user_ads_info`,
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

export async function claimAdsIncomePeels(secret, token) {
  return await claimAdsIncome(secret, token, 2);
}

export async function claimAdsIncomeSpeedup(secret, token) {
  return await claimAdsIncome(secret, token, 1);
}

export async function claimAdsIncome(secret, token, type) {
  const response = await secret.client.post(
    `https://interface.carv.io/banana/claim_ads_income`,
    {
      type,
    },
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

// {
//   "code": 0,
//   "msg": "Success",
//   "data": {
//     "payload": "af55fd34c6fcd6cd000000006740a9fa874b79ed3d9cc95e17865ea02b6ec998"
//   }
// }
export async function getTonWalletPayload(secret, token) {
  const response = await secret.client.get(
    `https://interface.carv.io/banana/get_ton_wallets_payload`,
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data?.payload;
}

export async function getSignatureTex(secret, token) {
  const response = await secret.client.get(
    `https://interface.carv.io/banana/get_signature_text`,
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

export async function bindWallet(secret, token) {
  const response = await secret.client.post(
    `https://interface.carv.io/banana/bind_wallets`,
    {

    },
    {
      headers: { ...commonHeaders, Authorization: token },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

// host: https://banana.carv.io
// turnstileToken: 0.gOzkOonFEGVpbcrH3n4KadNaE4XrYpAO2je4yjM4mce9GXBFiT5RkXIwTA9D8VemIEaaOInGoRJvnhWuAb-28ACjaeQZp3Mqvkwilc747kwqgAW4_GrV4D8-rFHYq6pg3wAOMCKHhyqHLbOWeFkXJ8p4iBqH5M8pE7dvA9ingS1B2QV1Fd2ll01bTVxJxTZZU7WqbO_PUIsACXWdwGY8AwKoss0LQ2WH5h8ooBw8UDlowMf91uz30Ue5GYBi_JT8XaTsfOaj9aT1uhw-5XHTHk9cyoaofpLzCzQa_wynVLEZsFpCplyhJ74EXNXSQOULsXVmYBtvyJye90EpIMS_tLs5gCWfCX0fYBYnlM9EVB4msfgPDycKhRBBa3Fr96iJu8RCRcVsewjFI7gqpUyxbNNTmW7EZj65lLpsqjWuIXJr1_ciFNAg2HAT4GvhWpVXKhI9wG4hKe9LGwbqCooxPbUVKtHT1izC8a6fWfcp_FP_YAZ3RR-_SiYuV_2DaLN2nEvOBX2EJ0jI5Dm4ZUMMlgTW-o_N8zEvpP_D-NzLAEWBd3wMSOqz2zWZ8g0pcsiBS0rNTmN3Zd0Ckcz5NSX88ZNLYpIHSowpTZiJhVT-FFtIPeGzj3uQVUaK_6gqVAYLHSl_WZntIPNjQ6AGONuPOVG3l91rQlgtkUBcsTgzPPus_Jn6f4MEDhdn4haXTstdIkvJ5P1wOtHugsmr6tNrl8qQh-q-DEyLdLC3424MH-o.UaSutyC5QudFRRVHBb0vCw.f7cabca13edab1d1e3ebd37271ee9ecb7740b377cc940c3164b123492afd2607
const turnstileTokenKey = (id) => `banana_turnstile_${id}`;
export async function doWithdraw(secret, token) {
  const { id } = parseTgUserFromInitParams(secret.privateKey);
  let turnstileToken = getItemObj(turnstileTokenKey(id));
  if (!turnstileToken) {
    secret.log(`Getting turnstileToken ...`);
    turnstileToken = await getBananaTurnstileToken(secret);
    setItem(turnstileTokenKey(id), turnstileToken, 5 * 60_000);
  }
  const response = await secret.client.post(
    `https://interface.carv.io/banana/do_withdraw`,
    {
      wallet_type: "TON_WALLET"
    },
    {
      headers: {
        ...commonHeaders,
        'X-Turnstile-Token': turnstileToken,
        Authorization: token
      },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data;
}

// {
//   "wallet_type": "TON_WALLET",
//   "address": "0:1a50ad2a37b8ac4625f2e28c0abb643876f7085cabc1498ee5d79d54fb544d1e",
//   "network": "-239",
//   "proof": {
//     "timestamp": 1732293244,
//     "domain": {
//       "lengthBytes": 14,
//       "value": "banana.carv.io"
//     },
//     "signature": "Gj9j0996/12lY4Qwhzcpf6UFL9Uq6wvCy/A3V6sdOjG52WpteeX6gkO3HLo6GfYNjtCQBW2CD+DWJ7/EUzc5Dg==",
//     "payload": "482725391bc17b9c000000006740b36346f71f57406d9d54cfc35076e2a5ce81",
//     "stateInit": "te6cckECFgEAAwQAAgE0ARUBFP8A9KQT9LzyyAsCAgEgAxACAUgEBwLm0AHQ0wMhcbCSXwTgItdJwSCSXwTgAtMfIYIQcGx1Z70ighBkc3RyvbCSXwXgA/pAMCD6RAHIygfL/8nQ7UTQgQFA1yH0BDBcgQEI9ApvoTGzkl8H4AXTP8glghBwbHVnupI4MOMNA4IQZHN0crqSXwbjDQUGAHgB+gD0BDD4J28iMFAKoSG+8uBQghBwbHVngx6xcIAYUATLBSbPFlj6Ahn0AMtpF8sfUmDLPyDJgED7AAYAilAEgQEI9Fkw7UTQgQFA1yDIAc8W9ADJ7VQBcrCOI4IQZHN0coMesXCAGFAFywVQA88WI/oCE8tqyx/LP8mAQPsAkl8D4gIBIAgPAgEgCQ4CAVgKCwA9sp37UTQgQFA1yH0BDACyMoHy//J0AGBAQj0Cm+hMYAIBIAwNABmtznaiaEAga5Drhf/AABmvHfaiaEAQa5DrhY/AABG4yX7UTQ1wsfgAWb0kK29qJoQICga5D6AhhHDUCAhHpJN9KZEM5pA+n/mDeBKAG3gQFImHFZ8xhAT48oMI1xgg0x/TH9MfAvgju/Jk7UTQ0x/TH9P/9ATRUUO68qFRUbryogX5AVQQZPkQ8qP4ACSkyMsfUkDLH1Iwy/9SEPQAye1U+A8B0wchwACfbFGTINdKltMH1AL7AOgw4CHAAeMAIcAC4wABwAORMOMNA6TIyx8Syx/L/xESExQAbtIH+gDU1CL5AAXIygcVy//J0Hd0gBjIywXLAiLPFlAF+gIUy2sSzMzJc/sAyEAUgQEI9FHypwIAcIEBCNcY+gDTP8hUIEeBAQj0UfKnghBub3RlcHSAGMjLBcsCUAbPFlAE+gIUy2oSyx/LP8lz+wACAGyBAQjXGPoA0z8wUiSBAQj0WfKnghBkc3RycHSAGMjLBcsCUAXPFlAD+gITy2rLHxLLP8lz+wAACvQAye1UAFEAAAAAKamjF4M973L7Fa5B0/CuqCyzWm4TGBs0cfeVj4mV4Mc5oko1QFZSyTI="
//   }
// }
// response: {
//   "code": 0,
//   "msg": "Success",
//   "data": null
// }
export async function checkTonWalletProof(secret, token, message) {
  const payload = await prepareProofBody(secret, message);
  // console.log(payload)
  if (!payload) {
    throw new Error("can not generate proof body")
  }
  const response = await secret.client.post(
    `https://interface.carv.io/banana/check_ton_wallets_proof`,
    payload,
    {
      headers: {
        ...commonHeaders,
        Authorization: token
      },
      withInterceptorIdHeader: true,
    }
  );
  if (response?.data?.code !== 0) throw new Error(response?.data?.msg || JSONStringtify(response?.data));
  return response?.data?.data;
}

export async function prepareProofBody(secret, message) {
  const wallet = await secret.getWallet();
  const address = wallet?.address;
  if (!address) {
    secret.log("Missing seedphrase");
    return;
  }
  const proof = await generateBananaTonProof(secret, message);
  return {
    "wallet_type": "TON_WALLET",
    "address": address.toRawString(),
    "network": "-239",
    "proof": proof,
  }
}

export async function generateBananaTonProof(secret, message) {
  const wallet = await secret.getWallet();
  const address = wallet?.address;
  const keyPair = await secret.getKeyPair();
  return await generateTonProof(
    wallet,
    address.toString(),
    keyPair,
    "https://banana.carv.io",
    message
  );
}

// VITE_APP_ENV: "prod",
// VITE_HOST: "https://banana.carv.io",
// VITE_BACKEND_HOST: "https://interface.carv.io",
// VITE_BACKEND_CF_HOST: "https://interface.cloudflare.carv.io",
// VITE_RECAPTCHA_SITE_KEY: "6Lc3yCkqAAAAABazWwyZ0lcNIDcoQGnOAICzvbPf",
// VITE_TELEGRAM_BOT: "OfficialBananaBot",
// VITE_TELEGRAM_APP: "banana",
// VITE_WALLETCONNECT_PROJECT_ID: "43aef85a86dbc309aadb9f9d7356619e",
// VITE_BLOCK_ID: "2748",
// VITE_CRYPTO_SALT: "EWbnkc7qHBtenQee",
// VITE_FOOTPRINT_DOMAIN: "https://app.ton.ai",
// VITE_FOOTPRINT_API_KEY: "EZfhgyBhrw7ydQc4DMuX6LtmRNfWiG",
// VITE_FOOTPRINT_BLOCK_ID: "6708d12a32c6c1a0b3fdaeb3",
// VITE_OPENAD_ZONE_ID: "116",
// VITE_OPENAD_PUBLISHER_ID: "87",
// VITE_TG_ANALYTIC_RECORD_TOKEN: "eyJhcHBfbmFtZSI6Ik9mZmljaWFsQmFuYW5hQm90IiwiYXBwX3VybCI6Imh0dHBzOi8vdC5tZS9PZmZpY2lhbEJhbmFuYUJvdCIsImFwcF9kb21haW4iOiJodHRwczovL2JhbmFuYS5jYXJ2LmlvIn0=!J/1bV0+Kdn6BYqwtObA2OvBYQGz62hXNB9TPVlgHiKk=",
// VITE_TG_ANALYTIC_GETTING_TOKEN: "eyJhcHBfbmFtZSI6Ik9mZmljaWFsQmFuYW5hQm90IiwiYXBwX3VybCI6Imh0dHBzOi8vdC5tZS9PZmZpY2lhbEJhbmFuYUJvdCIsImFwcF9kb21haW4iOiJodHRwczovL2JhbmFuYS5jYXJ2LmlvIn0=!QL9eSSRJQUmd1W0zyrnAQUKYqzW3A5xhRFaUonJITWg=",
// VITE_TURNSTILE_SITE_KEY: "0x4AAAAAAAyrBuzHYpH5lZio",
// VITE_GITHUB_SHA: "4fb1c2adcc19f885dd5ad12055316573851b4fbb",
// VITE_SENTRY_AUTH_TOKEN: "d1245e70f9814828b4666b14a6bd7c4b00441b9cacf64576ae3bd3a36d5fc7b6",
// VITE_CJS_IGNORE_WARNING: "true",
// VITE_USER_NODE_ENV: "production",
// VITE_ROOT_DIR: "/home/runner/work/banana-game-uniapp/banana-game-uniapp",
// BASE_URL: "/",
// MODE: "prod",
