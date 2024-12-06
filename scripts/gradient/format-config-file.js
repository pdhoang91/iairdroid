import { generateUniqueId } from "../../utils/gradient-network.js";
import { writeFile } from "../../utils/loader.js";
import { getAllGradientAddress } from "../../utils/wallet.js";

const main = async () => {
  const secrets = await getAllGradientAddress();
  const tgMap = {}
  const rows = secrets.map((secret, i) => {
    const name = secret.id;

    const id = generateUniqueId(secret)
    const result = `${name},${secret.username}|${secret.password}))},${secret.receiveAddress || ""},,,,${secret.proxyStr || ""}`
    if (!tgMap[id]) {
      tgMap[id] = result
      return result
    } else {
      console.log(`Duplicate record at row ${i + 1} with username ${secret.username} and proxy ${secret?.proxy?.ip}`)
    }
  }).filter((str) => str)
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-gradient.private.csv", output);
};

main();
