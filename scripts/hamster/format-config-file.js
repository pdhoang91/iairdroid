import { parseTgUserId } from "../../utils/hamster.js";
import { writeFile } from "../../utils/loader.js";
import { loadHamsterDictionary } from "../../utils/seedphrase-dictionary.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const main = async () => {
  const secrets = await getAllHamsterAddress();
  const { getOrEmpty } = loadHamsterDictionary()
  const tgMap = {}
  const rows = secrets.map((secret, i) => {
    const name = parseTgUserId(secret);

    if (!secret.receiveAddress) {
      const seedphrase = getOrEmpty(name)
      if (!seedphrase) {
        console.log(`Missing seedphrase for user ${name}`)
      } else {
        secret.receiveAddress = seedphrase;
      }
    }
    const result = `${name},${secret.privateKey},${secret.receiveAddress || ""},,,,${secret.proxyStr}`
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
  writeFile("config/output-hamster.private.csv", output);
};

main();
