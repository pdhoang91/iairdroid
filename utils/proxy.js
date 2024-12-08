import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { threadSafeMap } from "./semaphore.js";
import { anonymizeProxy, closeAnonymizedProxy } from "proxy-chain";

export const newProxyClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api.ipregistry.co/",
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 10000,
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

export const defaultProxyClient = newProxyClientWithProxy();

const { getOrSetIfEmpty, deleteVal, isExist } = threadSafeMap();
export const registerAnonymousProxy = async (secret, silence = true) => {
  if (!secret.proxy) return false;
  const { user, passsword, ip, port } = secret.proxy;
  const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
  const { url } = await getOrSetIfEmpty(
    proxyStr,
    async () => {
      const newProxyUrl = await anonymizeProxy(proxyStr);
      return {
        url: newProxyUrl,
        count: 0,
      };
    },
    (proxyObj) => {
      proxyObj.count += 1;
      if (!silence) {
        secret.log(`Use anonymous proxy ${proxyObj.url} for address ${secret.proxy.ip}:${secret.proxy.port}`);
      }
    },
    (proxyObj) => {
      if (!silence) {
        secret.log(`Anonymous proxy ${proxyObj.url} created`);
      }
    }
  );
  return url;
};

export const unregisterAnonymousProxy = async (secret, silence = true) => {
  if (!secret.proxy) return false;
  const { user, passsword, ip, port } = secret.proxy;
  const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
  if (!isExist(proxyStr)) return false;
  const { count } = await getOrSetIfEmpty(
    proxyStr,
    async () => {
      throw new Error("should not create anonymous proxy when deleting");
    },
    (proxyObj) => {
      proxyObj.count -= 1;
    }
  );
  if (count <= 0) {
    await deleteVal(proxyStr, async(proxyObj) => {
      if (!silence) {
        secret.log(`Clean up anonymous proxy ${proxyObj.url}`);
      }
      await closeAnonymizedProxy(proxyObj.url, true);
    })
    return true;
  }
  return false;
};

export const getCountryCode = async (secret) => {
  const res = await secret.client.get(
    `/${secret.privateKey}?key=tryout&pretty=true`
  );
  const security = res?.data?.security;

  return {
    countryCode: res?.data?.location?.country?.code,
    continentCode: res?.data?.location?.continent?.code,
    isTrusted:
      !security?.is_abuser &&
      !security?.is_attacker &&
      !security?.is_bogon &&
      !security?.is_proxy &&
      !security?.is_tor &&
      !security?.is_threat,

    // !security?.is_abuser &&
    // !security?.is_attacker &&
    // !security?.is_threat &&
    // !security?.is_anonymous &&
    // !security?.is_cloud_provider
  };
};

export const checkProxyIP = async (proxy) => {
  try {
    const proxyAgent = new HttpsProxyAgent(proxy);
    const response = await axios.get("https://api.ipify.org?format=json", {
      httpsAgent: proxyAgent,
    });
    if (response.status === 200) {
      console.log("\nĐịa chỉ IP của proxy là:", response.data.ip);
    } else {
      console.error(
        "Không thể kiểm tra IP của proxy. Status code:",
        response.status
      );
    }
  } catch (error) {
    console.error("Error khi kiểm tra IP của proxy:", error);
  }
};
