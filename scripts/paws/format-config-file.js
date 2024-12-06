import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { writeFile } from "../../utils/loader.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPawsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const main = async () => {
  const secrets = await getAllPawsAddress();
  const tgMap = {}
  const rows = secrets.map((secret, i) => {
    const { id: name } = parseTgUserFromInitParams(secret.privateKey);

    const result = `${name},${btoa(secret.privateKey)},${secret.receiveAddress || ""},,,,,${secret.proxyStr || ""}`
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
  writeFile("config/output-paws.private.csv", output);
};

main();
