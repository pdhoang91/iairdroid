import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

const commonHeaders = {
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
  "Content-Type": "application/json",
  Origin: "https://dog-ways.newcoolproject.io",
  Referer: "https://dog-ways.newcoolproject.io/",
  "Sec-Ch-Ua":
    '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
  "Sec-Ch-Ua-Mobile": "?1",
  "Sec-Ch-Ua-Platform": '"Android"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36",
  "X-Gg-Client": "v:1 l:en",
};

export const newLostDogClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api.getgems.io/graphql",
    headers: { ...commonHeaders },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

export const saveEvent = async (secret) => {
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };
  const response = await secret.client.post(
    "/",
    {
      operationName: "lostDogsWaySaveEvent",
      variables: {
        data: {
          events: [{ launch: true, timeMs: new Date().getTime() }],
          utm: {
            campaign: null,
            content: null,
            medium: null,
            source: null,
            term: null,
          },
        },
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash:
            "0b910804d22c9d614a092060c4f1809ee6e1fc0625ddb30ca08ac02bac32936a",
        },
      },
    },
    { headers }
  );
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data?.lostDogsWaySaveEvent;
};

export const loginNotcoin = async (secret) => {
  const headers = { ...commonHeaders };
  const response = await secret.client.post(
    "https://api.notcoin.tg/auth/login",
    {
      webAppData: secret.privateKey,
    },
    { headers }
  );
  const accessToken = response.data?.data?.accessToken;
  const telegramId = response.data?.data?.telegramId;
  const userId = response.data?.data?.userId;
  return { accessToken, telegramId, userId };
};

export const getNotcoinProfile = async (secret, telegramId) => {
  const headers = { ...commonHeaders };
  const response = await secret.client.get(
    `https://api.notcoin.tg/profiles/by/telegram_id/${telegramId}`,
    { headers }
  );
  return response.data?.data;
};

export const generateWallet = async (secret) => {
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };
  const response = await secret.client.post(
    "/",
    {
      operationName: "lostDogsWayGenerateWallet",
      variables: {},
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash:
            "d78ea322cda129ec3958fe21013f35ab630830479ea9510549963956127a44dd",
        },
      },
    },
    { headers }
  );
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data?.data?.lostDogsWayGenerateWallet;
};

export const login = async (secret, userCreated = true) => {
  if (!userCreated) {
    // secret.log("Đang tạo account");
    // const { accessToken, telegramId, userId } = await loginNotcoin(secret);
    // await getNotcoinProfile(secret, telegramId);
    // secret.log("Đã tạo account Notcoin");
    const { user, walletStatus } = await generateWallet(secret);
    secret.log(`Đã đăng kí account cho user ${user.nickname} (id=${user.id})`);
  }
  try {
    return await getLostDogsWayUserInfo(secret);
  } catch (e) {
    if (e.message == "User not found") {
      return login(secret, false);
    }
    throw e;
  }
};

export const getLostDogsWayUserInfo = async (secret) => {
  const url =
    "/?operationName=lostDogsWayUserInfo&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22a17a9e148547c1c0ab250cca329a3ca237d46b615365dbd217e32aa7c068d10f%22%7D%7D";
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.get(url, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data?.lostDogsWayUserInfo;
};

export const getRefInfo = async (secret) => {
  const url =
    "/graphql?operationName=lostDogsWayUserReferralInfo&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22b8715a45063000b04aceb73f791b95dfbecf3f85e5399b34c02a0d544bb84008%22%7D%7D";
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.get(url, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  const {invitedPeopleCount, referralLink} = response.data.data?.lostDogsWayUserReferralInfo;
  const refCode = referralLink.split("startapp=")[1]
  return {
    invitedPeopleCount,
    referralLink,
    refCode,
  }
};

export const getDailyGift = async (secret) => {
  const url =
    "/?operationName=lostDogsWayDailyGifts&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2243b2f4613ced5169c8dfa2d6f0226c2e16dedb4715e699a8d325d087bab79e79%22%7D%7D";
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.get(url, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data?.lostDogsWayDailyGifts?.items || [];
};

export const getLostDogsWayGameStatus = async (secret) => {
  const url =
    "/?operationName=lostDogsWayGameStatus&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22f706c4cd57a87632bd4360b5458e65f854b07e690cf7f8b9f96567fe072148c1%22%7D%7D";
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.get(url, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data?.lostDogsWayGameStatus?.gameState;
};

export const getHomePage = async (secret) => {
  const url =
    "/graphql?operationName=getHomePage&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%226d07a34b66170fe08f878f8d8b000a5611bd7c8cee8729e5dc41ae848fab4352%22%7D%7D";
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.get(url, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data?.lostDogsWayGameStatus;
};

export const lostDogsWayVote = async (secret, value) => {
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };
  const payload = {
    operationName: "lostDogsWayVote",
    variables: { value: value.toString() },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash:
          "6fc1d24c3d91a69ebf7467ebbed43c8837f3d0057a624cdb371786477c12dc2f",
      },
    },
  };

  const response = await secret.client.post("/", payload, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data?.lostDogsWayVote;
};

export const getDogsPage = async (secret) => {
  const url =
    "/graphql?operationName=getDogsPage&variables=%7B%22withCommonTasks%22%3Atrue%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22a23b386ba13302517841d83364cd25ea6fcbf07e1a34a40a5314da8cfd1c6565%22%7D%7D";
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.get(url, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data;
};

export const getNotDoneTasks = async (secret) => {
  const { lostDogsWayCommonTasks, lostDogsWayUserCommonTasksDone } = await getDogsPage(secret);
  return lostDogsWayCommonTasks.items.filter(({ id }) => !lostDogsWayUserCommonTasksDone.includes(id));
}

export const completeCommonTask = async (secret, taskId) => {
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };
  const payload = { "operationName": "lostDogsWayCompleteCommonTask", "variables": { "id": taskId }, "extensions": { "persistedQuery": { "version": 1, "sha256Hash": "313971cc7ece72b8e8edce3aa0bc72f6e40ef1c242250804d72b51da20a8626d" } } };

  const response = await secret.client.post("/", payload, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data?.data?.lostDogsWayCompleteCommonTask;
};

export const getLeagueInfo = async (secret) => {
  const url =
    "/graphql?operationName=lostDogsWayUserLeagueInfo&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22cf5309020dc192b680d45f430d0e919345db5222ec42aeeaa0d8c2e798bc33c3%22%7D%7D";
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.get(url, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data?.data?.lostDogsWayUserLeagueInfo;
};

export const getUserProfile = async (secret) => {
  const url =
    "/graphql?operationName=lostDogsWayUserProfile&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22ed0ac60abddc438754ed6cd08465ef500fde5ed209e0fd26710a7c03d0065021%22%7D%7D";
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.get(url, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data?.data?.lostDogsWayUserProfile;
};

export const getWalletStatus = async(secret) => {
  const {walletStatus} = await getUserProfile(secret);
  return walletStatus;
}

export const buyBonesByNot = async(secret, amount) => {
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.post("/", {"operationName":"lostDogsWayBuyDogsNotcoin","variables":{"dogsCount":amount},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"e4469e3f3382d1f840192b2686e14349ef5d721a18cbc0cfedd47c6f0c24d88d"}}}, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data?.data?.lostDogsWayBuyDogsNotcoin;
};


// tonConnectProof : {
//   "address": "0:c5f3b6e9800d36b396bddb26a8839af4c79fb378f18cbb4d223150c2c582dbcd",
//   "authApplication": "prd=http plf=iphone app=Tonkeeper v=4.9.0 mp=2 f=[\"SendTransaction\",{\"name\":\"SendTransaction\",\"maxMessages\":4}]",
//   "chain": "-239",
//   "domainLengthBytes": 19,
//   "domainValue": "dog-ways.getgems.io",
//   "payload": "gems",
//   "signature": "+d3Grm3LTpOrb9n6JPmvFCkPJjv0HWxiPGmQ90znkR2tZyuXca55JHfNwrGhw2ks9yPk5jRjsNM0E5hZeUmLAg==",
//   "timestamp": 1724062681,
//   "walletStateInit": "te6cckECFgEAAwQAAgE0AgEAUQAAAAApqaMXyU2ndG7nE3RvWvWNXpo6+kgzM7GAGgKRPrr2B2g5aBFAART/APSkE/S88sgLAwIBIAkEBPjygwjXGCDTH9Mf0x8C+CO78mTtRNDTH9Mf0//0BNFRQ7ryoVFRuvKiBfkBVBBk+RDyo/gAJKTIyx9SQMsfUjDL/1IQ9ADJ7VT4DwHTByHAAJ9sUZMg10qW0wfUAvsA6DDgIcAB4wAhwALjAAHAA5Ew4w0DpMjLHxLLH8v/CAcGBQAK9ADJ7VQAbIEBCNcY+gDTPzBSJIEBCPRZ8qeCEGRzdHJwdIAYyMsFywJQBc8WUAP6AhPLassfEss/yXP7AABwgQEI1xj6ANM/yFQgR4EBCPRR8qeCEG5vdGVwdIAYyMsFywJQBs8WUAT6AhTLahLLH8s/yXP7AAIAbtIH+gDU1CL5AAXIygcVy//J0Hd0gBjIywXLAiLPFlAF+gIUy2sSzMzJc/sAyEAUgQEI9FHypwICAUgTCgIBIAwLAFm9JCtvaiaECAoGuQ+gIYRw1AgIR6STfSmRDOaQPp/5g3gSgBt4EBSJhxWfMYQCASAODQARuMl+1E0NcLH4AgFYEg8CASAREAAZrx32omhAEGuQ64WPwAAZrc52omhAIGuQ64X/wAA9sp37UTQgQFA1yH0BDACyMoHy//J0AGBAQj0Cm+hMYALm0AHQ0wMhcbCSXwTgItdJwSCSXwTgAtMfIYIQcGx1Z70ighBkc3RyvbCSXwXgA/pAMCD6RAHIygfL/8nQ7UTQgQFA1yH0BDBcgQEI9ApvoTGzkl8H4AXTP8glghBwbHVnupI4MOMNA4IQZHN0crqSXwbjDRUUAIpQBIEBCPRZMO1E0IEBQNcgyAHPFvQAye1UAXKwjiOCEGRzdHKDHrFwgBhQBcsFUAPPFiP6AhPLassfyz/JgED7AJJfA+IAeAH6APQEMPgnbyIwUAqhIb7y4FCCEHBsdWeDHrFwgBhQBMsFJs8WWPoCGfQAy2kXyx9SYMs/IMmAQPsABuFCnpg=",
//   "publicKey": "c94da7746ee713746f5af58d5e9a3afa483333b1801a02913ebaf60768396811"
// }
export const linkWallet = async(secret, tonConnectProof) => {
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.post("/", {
    "operationName":"lostDogsWayLinkTonWallet", 
    query: "mutation lostDogsWayLinkTonWallet($tonConnectProof: TonConnectAuthPayload!) {\n  lostDogsWayLinkTonWallet(tonConnectProof: $tonConnectProof) {\n    walletStatus {\n      ...lostDogsWayWalletStatus\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment lostDogsWayWalletStatus on LostDogsWayWalletStatus {\n  id\n  connectedWalletAddress\n  isNotBalanceClaimable\n  notBalance\n  __typename\n}",
    "variables":{"tonConnectProof": tonConnectProof},
  }, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data?.data?.lostDogsWayLinkTonWallet?.walletStatus;
};

export const removeWallet = async(secret) => {
  const headers = { ...commonHeaders, "X-Auth-Token": secret.privateKey };

  const response = await secret.client.post(
    "/", 
    {"operationName":"lostDogsWayRemoveWallet","variables":{},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"05eba4341868308f4101ec1234ee8d48ce20f182b753542c6b7fbf3ea8b92fa9"}}}, 
    { headers },
  );
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data?.data?.lostDogsWayRemoveWallet?.walletStatus;
};