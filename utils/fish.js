import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://tgames.bcsocial.net",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Origin: "https://tgames.bcsocial.net",
    Referer: "https://tgames.bcsocial.net/",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    "Sec-Ch-Ua": `"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"`,
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": `"macOS"`,
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  },
});

export const setNewCloudfareSession = async (sender) => {
  const res = await axiosClient.get("/", {
    headers: {
      "Content-Type": undefined,
      Origin: undefined,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",

      "Sec-Fetch-Dest": "iframe",
      "Sec-Fetch-Mode": "navigate",
      Priority: "u=0, i",
      "Cache-Control": "max-age=0",
      "Upgrade-Insecure-Requests": "1",
      // "If-Modified-Since": "Wed, 29 May 2024 11:57:07 GMT"
    }
  })
  if (res.headers["set-cookie"]?.length > 0) {
    const [__cf_bm, ci_session] = getNewSessionPart(res);
    sender.setNewSession(__cf_bm)
    return __cf_bm
  }
  return null
}

export const getUser = async (sender) => {
  const res = await axiosClient.post(
    "/panel/users/getUser",
    {},
    {
      headers: {
        Cookie: sender.privateKey,
      },
    }
  );
  if (res.status != 200) {
    throw new Error(res.data.data);
  }
  if (res.headers["set-cookie"]?.length > 0) {
    const [__cf_bm, ci_session] = getNewSessionPart(res);
    console.log("Update new session");
    sender.setNewSession(__cf_bm, ci_session);
    return await login(sender);
  }
  if (res.data.code != 0) {
    throw new Error(res.data.message);
  }
  return res.data.data;
};

const getNewSessionPart = (res) => {
  const cookieList = res.headers["set-cookie"];
  const newCookies = cookieList.map((cookies) => {
    const first = cookies.split(";")[0];
    const [cookieName, value] = first.split("=");
    return {
      cookieName,
      value,
    };
  });

  const __cf_bm = newCookies.find(({ cookieName }) => cookieName == "__cf_bm");
  const ci_session = newCookies.find(
    ({ cookieName }) => cookieName == "ci_session"
  );
  return [__cf_bm?.value, ci_session?.value];
};

export const login = async (sender, setNewCloudFlare = true) => {
  if (setNewCloudFlare) {
    sender.ci_session = "";
    await setNewCloudfareSession(sender);
  }
  const { id, first_name, last_name, username, language_code } = JSON.parse(
    sender.teleInitParams.user
  );
  const params = {
    externalId: id,
    username,
    firstName: first_name,
    lastName: last_name,
    gameId: 1,
    language: language_code,
    initData: sender.teleInitParams,
    refId: "",
  };
  const res = await axiosClient.post("/panel/users/login", params, {
    headers: {
      "Accept": "application/json, text/plain, */*",
      Cookie: sender.privateKey,
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      Priority: "u=1, i"
    },
  });
  if (res.status != 200) {
    throw new Error(res.data.data);
  }
  if (res.headers["set-cookie"]?.length > 0) {
    const [__cf_bm, ci_session] = getNewSessionPart(res);
    sender.setNewSession(__cf_bm, ci_session)
    if (res.data.code != 0) {
      return await login(sender, false)
    }
  }
  // if (res.data.code == 22) {
  //   return await login(sender, false)
  // }
  if (res.data.code != 0) {
    throw new Error(res.data.message);
  }
  return res.data.data;
};

export const verifyCapcha = async (sender, question) => {
  const res = await axiosClient.post(
    "/panel/users/verifyCapcha",
    {
      code: "" + eval(question),
    },
    {
      headers: {
        Cookie: sender.privateKey,
      },
    }
  );
  if (res.status != 200) {
    throw new Error(res.data.data);
  }
  if (res.data.code != 0) {
    throw new Error(res.data.message);
  }
  return res.data;
};

export const claimFish = async (sender) => {
  const user = await getUser(sender);
  if (user.capcha) {
    console.log(`Resolving capcha "${user.capcha}"`);
    await verifyCapcha(sender, user.capcha.replaceAll("=", ""));
  }
  const res = await axiosClient.post(
    "/panel/games/claim",
    {
      amount: user.level,
    },
    {
      headers: {
        Cookie: sender.privateKey,
      },
    }
  );
  if (res.status != 200) {
    throw new Error(res.data);
  }
  if (res.data.code != 0) {
    throw new Error(res.data.message);
  }
  return res.data.data;
};
