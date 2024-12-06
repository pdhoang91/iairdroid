import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import Web3 from "web3";

export const newMemeClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://memestaking-api.stakeland.com",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.stakeland.com",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
    log(`Tạo meme client với proxy ${ip}:${port}`);
  }
  return axios.create(param);
};
export const defaultMemeClient = newMemeClientWithProxy();

export const getMemeWalletInfo = async (secret) => {
  const response = await secret.client.get(`/wallet/info/${Web3.utils.toChecksumAddress(secret.address)}`);
  return response.data;
};

export const getMemeFarmingStatus = async (secret) => {
  const response = await secret.client.get(`/farming/info/${Web3.utils.toChecksumAddress(secret.address)}`);
  return response.data;
};

export const isMemeConnectedX = async (secret) => {
  const { rewards } = await getMemeFarmingStatus(secret);
  const connectx = rewards.find((reward) => reward?.type == "connectX");
  return connectx?.completed
};
