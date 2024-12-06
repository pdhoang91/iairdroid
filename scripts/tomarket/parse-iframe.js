import { parseTgUserFromInitParams, randomInt, sleep } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { loadTomarketDictionary } from "../../utils/seedphrase-dictionary.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { login, newTomarketClientWithProxy } from "../../utils/tomarket.js";

const { exec } = newSemaphore(300);

const main = async () => {
  const data = loadFile("config/iframetomarket.private.txt").toString("utf8");
  const tgMap = {};
  const { getOrEmpty } = loadTomarketDictionary();
  const rows = (
    await Promise.all(
      data
        .split("\n")
        .filter((str) => str)
        .map(async (str, i) => {
          let [name, link, proxyStr] = str.split("|");
          let rawTgWebAppData = link, parts = [];
          if (link.startsWith("https://mini-app.tomarket.ai")) {
            rawTgWebAppData = decodeURIComponent(rawTgWebAppData.split("#")[1].split("=")[1])
            for (const part of rawTgWebAppData.split("&")) {
              try {
                if (part.startsWith("hash")) break
              } finally {
                parts.push(part)
              }
            }
            rawTgWebAppData = parts.join("&");
          }
          const { id } = parseTgUserFromInitParams(rawTgWebAppData)
          if (!name) {
            name = id;
          }
          if (tgMap[name]) {
            console.log(`Duplicate record at row ${i + 1} with name ${name}`);
            return
          }
          tgMap[name] = true;
          let token, proxy;
          if (proxyStr && proxyStr.split(":").length == 4) {
            const parts = proxyStr.split(":");
            proxy = {
              user: parts[2]?.trim?.(),
              passsword: parts[3]?.trim?.(),
              ip: parts[0]?.trim?.(),
              port: parts[1]?.trim?.(),
            };
          }
          await exec(async () => {
            while (true) {
              try {
                token = await login({
                  client: newTomarketClientWithProxy(proxy),
                  privateKey: rawTgWebAppData.trim(),
                  log: (msg) => console.log(`${name} ${msg}`),
                });
                return;
              } catch (e) {
                console.log(`${name} ERROR: ${e?.message}`);
              } finally {
                await sleep(randomInt(0.1, 0.5));
              }
            }
          });
          const seedphrase = getOrEmpty(id);
          if (!seedphrase) {
            console.log(`Missing seedphrase for user ${id}`);
          }
          const record = (
            name +
            "," +
            btoa(
              JSON.stringify({
                initParams: rawTgWebAppData.trim(),
                token,
              })
            ) +
            `,${seedphrase || ""},,,,${proxyStr}`
          );
          return {
            entry: record,
            missingSeedphrase: seedphrase ? 0 : 1,
          }
        })
    )
  ).filter((str) => str).sort((a, b) => a.missingSeedphrase - b.missingSeedphrase).map(({entry}) => entry);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-tomarket.private.csv", output);
};

main();
