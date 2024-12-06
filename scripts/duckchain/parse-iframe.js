import {
  getInviteInfo,
  login,
  newDuckChainClientWithProxy,
} from "../../utils/duckchain.js";
import { parseTgUserFromInitParams, sleep } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllDuckchainAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const MAX_RETRY = 3;
const MAX_REF_PER_ACCOUNT = 10;
const main = async () => {
  const secrets = await getAllDuckchainAddress();
  const tgMap = {};
  const refList = (
    await Promise.all(
      secrets.map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              const { inviteCode, boxesEarned } = await getInviteInfo(secret);
              return {
                inviteCode,
                boxesEarned,
              };
            } catch (e) {
              secret.error(e);
              await sleep(1);
            }
          }
        })
      )
    )
  )
    .filter((val) => val)
    .filter(({ boxesEarned }) => boxesEarned < MAX_REF_PER_ACCOUNT);
  console.log(`Found ${refList.length} ref code!`);
  let i = 0;
  const getNextRefCode = () => {
    const refInfo = refList[i];
    if (!refInfo) throw new Error("missing ref code");
    if (refInfo.boxesEarned >= MAX_REF_PER_ACCOUNT) {
      i++;
      return getNextRefCode();
    }
    refInfo.boxesEarned += 1;
    return refInfo.inviteCode;
  };
  const data = loadFile("config/iframeduckchain.private.txt").toString("utf8");
  const rows = (
    await Promise.all(
      data
        .split("\n")
        .filter((str) => str)
        .map(async (str, i) => {
          let [name, link] = str.split("|");
          let rawTgWebAppData = link,
            parts = [];
          if (link.startsWith("https://tgdapp.duckchain.io")) {
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
          if (!name) {
            const { id } = parseTgUserFromInitParams(rawTgWebAppData);
            name = id;
          }
          if (tgMap[name]) {
            console.log(`Duplicate record at row ${i + 1} with name ${name}`);
            return
          }
          tgMap[name] = true;
          let retry = 0,
            refCode;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              if (!refCode) {
                refCode = getNextRefCode();
              }
              const secret = {
                client: newDuckChainClientWithProxy(),
                privateKey: rawTgWebAppData.trim(),
                log: (msg) => console.log(`${name} ${msg}`),
              };
              await exec(() => login(secret, refCode));
              break;
            } catch (e) {
              // console.log(rawTgWebAppData)
              console.error(e);
              console.error(`${name} ERROR: ${e?.message}`);
              await sleep(1);
            }
          }
          const result = name + "," + btoa(rawTgWebAppData.trim()) + ",,,,,";
          return result;
        })
    )
  ).filter((str) => str);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-duckchain.private.csv", output);
};

main();
