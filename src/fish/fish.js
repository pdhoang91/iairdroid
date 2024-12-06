let $ = require("jquery");
let { ipcRenderer } = require("electron");
const { newConsole } = require("../common/console.cjs");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { newSemaphore } = require("../common/semaphore.cjs");

let { exec } = newSemaphore(10);

const onConsole = newConsole("#main-console");

const newClientWithProxy = (proxy) => {
  const param = {
    baseURL: "https://tgames.bcsocial.net",
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://tgames.bcsocial.net",
      Referer: "https://tgames.bcsocial.net/",
    },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
    console.log(proxyStr);
  }
  return axios.create(param);
};

const setNewCloudfareSession = async (axiosClient, sender) => {
  const res = await axiosClient.get("/", {
    headers: {
      "Content-Type": undefined,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Fetch-Dest": "iframe",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin"
    }
  })
  if (res.headers["set-cookie"]?.length > 0) {
    const [__cf_bm, ci_session] = getNewSessionPart(res);
    sender.setNewSession(__cf_bm)
    return __cf_bm
  }
  return null
}
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

const getUser = async (axiosClient, sender) => {
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
  if (res.data.code != 0) {
    throw new Error(res.data.message);
  }
  return res.data.data;
};

const login = async (axiosClient, sender, setNewCloudFlare = true) => {
  if (setNewCloudFlare) {
    sender.ci_session = "";
    onConsole(`${sender.id} Bypass Cloudfare`)
    await setNewCloudfareSession(axiosClient, sender);
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
      Cookie: sender.privateKey,
    },
  });
  if (res.status != 200) {
    throw new Error(res.data.data);
  }
  if (res.headers["set-cookie"]?.length > 0) {
    const [__cf_bm, ci_session] = getNewSessionPart(res);
    onConsole(`${sender.id} Cập nhật session`)
    sender.setNewSession(null, ci_session)
    return await login(axiosClient, sender, false)
  }
  if (res.data.code != 0) {
    throw new Error(res.data.message);
  }
  return res.data.data;
};

const verifyCapcha = async (axiosClient, sender, question) => {
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

const claimFish = async (axiosClient, sender) => {
  const user = await getUser(axiosClient, sender);
  if (user.capcha) {
    onConsole(`${sender.id} Xử lí capcha "${user.capcha}"`);
    await verifyCapcha(axiosClient, sender, user.capcha.replaceAll("=", ""));
  }
  const res = await axiosClient.post(
    "/panel/games/claim",
    {
      amount: 1,
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

const claimFishForever = async (sender) => {
  const { id, proxy } = sender;
  const axiosClient = newClientWithProxy(proxy);
  let nextClaim = 3600;
  while (true) {
    try {
      onConsole(`${id} Đăng nhập`);
      const user = await exec(async () => await login(axiosClient, sender));
      if (user.nextClaimTime <= 0) {
        // claim
        onConsole(`${id} Bắt cá`);
        const data = await exec(async () => await claimFish(axios, sender))
        onConsole(`${id} Bắt cá thành công, kết quả: ${JSON.stringify(data)}`);
      } else {
        nextClaim = user.nextClaimTime;
      }
    } catch (e) {
      onConsole(`${id} Error: ${e}`);
    } finally {
      onConsole(
        `${id} Đặt lịch bắt cá sau ${(nextClaim / 60).toFixed(2)} phút`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, nextClaim * 1000));
  }
};

ipcRenderer.on("setup", (event, fileName) => {
  ipcRenderer.on(`${fileName}-console`, (event, log) => {
    onConsole(log);
  });

  ipcRenderer.on(`get-address-list-${fileName}`, async (event, secrets) => {
    onConsole(`Đã load ${secrets.length} địa chỉ!`);
    secrets.forEach((secret) => {
      secret.setNewSession = (__cf_bm, ci_session) => {
        let newPrivateKey = `__cf_bm=${secret.__cf_bm}`;
        if (__cf_bm) {
          secret.__cf_bm = __cf_bm;
          newPrivateKey = `__cf_bm=${__cf_bm}`;
        }
        if (!ci_session) {
          ci_session = secret.ci_session;
        }
        secret.ci_session = ci_session;
        if (ci_session) {
          newPrivateKey += `; ci_session=${ci_session}`;
        }
        secret.privateKey = newPrivateKey;
      };
    })
    while (true) {
      await Promise.all(
        secrets.map(async (secret) => {
          if (secret.proxy) {
            secret.id += " (proxy)";
          }
          await claimFishForever(secret);
        })
      );
      onConsole(
        "Đã chạy xong tất cả các token, nghỉ 10 giây rồi chạy lại từ đầu..."
      );
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  });

  ipcRenderer.send(`get-address-list-${fileName}`);
});

module.exports = {};
