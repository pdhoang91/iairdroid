import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { loadLostdogsDictionary } from "../../utils/seedphrase-dictionary.js";

const main = async () => {
  const { getOrEmpty } = loadLostdogsDictionary();
  const tgMap = {};
  const data = loadFile("config/iframelostdog.private.txt").toString("utf8");
  const rows = data
    .split("\n")
    .filter((str) => str)
    .map((str, i) => {
      let [name, rawTgWebAppData] = str.split("|");
      const { id } = parseTgUserFromInitParams(rawTgWebAppData);
      if (!name) {
        name = id;
      }
      if (tgMap[id]) {
        console.log(`Duplicate record at row ${i + 1} with name ${name}`);
        return;
      }
      const seedphrase = getOrEmpty(id);
      if (!seedphrase) {
        console.log(`Not found seedphrase for user ${id}`);
      }
      return name + "," + btoa(rawTgWebAppData.trim()) + `,${seedphrase},,,,`;
    })
    .filter((str) => str);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-lostdog.private.csv", output);
};

main();