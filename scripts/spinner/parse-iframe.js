import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";

const main = async () => {
  const tgMap = {}
  const data = loadFile("config/iframespinner.private.txt").toString("utf8");
  const rows = data
    .split("\n")
    .filter((str) => str)
    .map((str, i) => {
      let [name, link] = str.split("|");
      if (!link) return;
      let rawTgWebAppData = link,
        parts = [];
      if (link.startsWith("https://spinner.timboo.pro")) {
        rawTgWebAppData = decodeURIComponent(
          rawTgWebAppData.split("#")[1].split("=")[1]
        );
        for (const part of rawTgWebAppData.split("&")) {
          try {
            if (part.startsWith("hash")) break;
          } finally {
            parts.push(part);
          }
        }
        rawTgWebAppData = parts.join("&");
      }
      const { id } = parseTgUserFromInitParams(rawTgWebAppData);
      if (!name) {
        name = id;
      }
      if (tgMap[id]) {
        console.log(`Duplicate record at row ${i + 1} with name ${name}`)
        return
      }
      tgMap[id] = true;

      return name + "," + btoa(rawTgWebAppData.trim()) + ",,,,,";
    })
    .filter((str) => str);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-spinner.private.csv", output);
};

main();
