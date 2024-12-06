import { getTokenExpirationDate, parseTgUserFromInitParams } from "../../utils/helper.js";
import { writeFile } from "../../utils/loader.js";
import { loadYescoinDictionary } from "../../utils/seedphrase-dictionary.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllYescoinAddress } from "../../utils/wallet.js";
import { getUserToken } from "../../utils/yescoin.js";

const main = async () => {
  const secrets = await getAllYescoinAddress();
  const { getOrEmpty } = loadYescoinDictionary()
  const tgMap = {}
  let missingTokenCount = 0;
  const rows = secrets.map((secret, i) => {
    const { id: name } = parseTgUserFromInitParams(secret.privateKey);

    if (!secret.receiveAddress) {
      const seedphrase = getOrEmpty(name)
      if (!seedphrase) {
        console.log(`Missing seedphrase for user ${name}`)
      } else {
        secret.receiveAddress = seedphrase;
      }
    }
    const token = getUserToken(name);
    
    if (token && secret.token != token) {
      const expireTime = getTokenExpirationDate(token) - new Date();
      if (secret.token) {
        const oldExpireTime = getTokenExpirationDate(secret.token) - new Date();
        if (oldExpireTime < expireTime) {
          secret.log(`Use cache token for user ${name}`)
          secret.token = token;
        }
      } else {
        secret.log(`Use cache token for user ${name}`)
        secret.token = token;
      }
    }
    if (!secret.token) {
      console.warn(`Missing token for user ${name}`)
      missingTokenCount++;
    }
    
    const result = `${name},${btoa(JSON.stringify({
      initParams: secret.privateKey,
      token: secret.token || "",
    }))},${secret.receiveAddress || ""},,,,${secret.proxyStr}`
    if (!tgMap[name]) {
      tgMap[name] = result
      return result
    } else {
      console.log(`Duplicate record at row ${i + 1} with name ${name}`)
    }
  }).filter((str) => str)
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-yescoin.private.csv", output);
  console.log(`Total ${missingTokenCount} user missing tokens`);
};

main();
