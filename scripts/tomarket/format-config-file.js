import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { writeFile } from "../../utils/loader.js";
import {
  getAllTomarketAddress,
} from "../../utils/wallet.js";

const main = async () => {
  const secrets = await getAllTomarketAddress();
  const tgMap = {};
  const rows = secrets
    .map((secret, i) => {
      const { id: name } = parseTgUserFromInitParams(secret.privateKey);

      const result = `${name},${btoa(
        JSON.stringify({ initParams: secret.privateKey, token: secret.token })
      )},${secret.receiveAddress || ""},,,,${secret.proxyStr || ""}`;
      if (!tgMap[name]) {
        tgMap[name] = result;
        return {
          entry: result,
          missingSeedphrase: secret.receiveAddress ? 0 : 1,
        }
      } else {
        console.log(`Duplicate record at row ${i + 1} with name ${name}`);
      }
    })
    .filter((str) => str).sort((a, b) => a.missingSeedphrase - b.missingSeedphrase).map(({entry}) => entry);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-tomarket.private.csv", output);
};

main();
