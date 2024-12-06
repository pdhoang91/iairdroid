import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { writeFile } from "../../utils/loader.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBlumAddress } from "../../utils/wallet.js";

const main = async () => {
  const secrets = await getAllBlumAddress();
  const tgMap = {};
  const rows = secrets
    .map((secret, i) => {
      const { id: name } = parseTgUserFromInitParams(secret.privateKey);
      const result = `${name},${btoa(
        JSON.stringify({
          initParams: secret.privateKey,
          token: secret.token,
          refreshToken: secret.refreshToken,
          referralToken: secret.referralToken,
        })
      )},${secret.receiveAddress},,,,,${secret.proxyStr}`;
      if (!tgMap[name]) {
        tgMap[name] = result;
        return result;
      } else {
        console.log(`Duplicate record at row ${i + 1} with name ${name}`);
      }
    })
    .filter((str) => str);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-blum.private.csv", output);
};

main();
