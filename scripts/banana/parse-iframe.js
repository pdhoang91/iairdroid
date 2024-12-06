import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { loadBananaDictionary } from "../../utils/seedphrase-dictionary.js";

const main = async () => {
  const data = loadFile("config/iframebanana.private.txt").toString("utf8");
  const { getOrEmpty } = loadBananaDictionary();
  const tgMap = {}
  const rows = data
    .split("\n")
    .filter((str) => str)
    .map((str, i) => {
      let [name, link] = str.split("|");
      if (!link) return;
      let rawTgWebAppData = link,
        parts = [];
      if (link.startsWith("https://banana.carv.io")) {
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
      const { id } = parseTgUserFromInitParams(rawTgWebAppData)
      if (!name) {
        name = id;
      }
      if (tgMap[id]) {
        console.log(`Duplicate record at row ${i + 1} with name ${name}`)
        return
      }
      tgMap[id] = true
      const seedphrase = getOrEmpty(id);
      if (!seedphrase) {
        console.log(`Not found seedphrase for user ${id}`);
      }
      return {
        entry: name +
          "," +
          btoa(rawTgWebAppData.trim()) +
          `,${seedphrase || ""},,,,`,
        missingSeedphrase: seedphrase ? 0 : 1,
      }
    })
    .filter((str) => str).sort((a, b) => a.missingSeedphrase - b.missingSeedphrase).map(({entry}) => entry);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-banana.private.csv", output);
};

main();
