import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export const newProxyClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api.ipregistry.co/",
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 10000
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};

export const defaultProxyClient = newProxyClientWithProxy();

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
      !security?.is_threat

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