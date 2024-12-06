import { getRefferalCode, login } from "../../utils/blum.js";
import { parseTgUserFromInitParams, sleep } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBlumAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const MAX_RETRY = 3;
const MAX_REF_PER_ACCOUNT = 50;
const main = async () => {
  const secrets = await getAllBlumAddress();
  const tgMap = {};
  const refList = (
    await Promise.all(
      secrets.map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              await login(secret);
              const referralData = await getRefferalCode(
                secret
              );
              if (!referralData) return
              const { usedInvitation, referralToken } = referralData;
              return {
                usedInvitation,
                referralToken,
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
    .filter(({ usedInvitation }) => usedInvitation < MAX_REF_PER_ACCOUNT)
    .sort((a, b) => b.usedInvitation - a.usedInvitation);
  console.log(`Found ${refList.length} ref code!`);
  let i = 0;
  const getNextRefCode = () => {
    const refInfo = refList[i];
    if (!refInfo) throw new Error("missing ref code");
    if (refInfo.usedInvitation >= MAX_REF_PER_ACCOUNT) {
      i++;
      return getNextRefCode();
    }
    refInfo.usedInvitation += 1;
    return refInfo.referralToken;
  };
  const data = loadFile("config/iframeblum.private.txt").toString("utf8");
  const rows = data
    .split("\n")
    .filter((str) => str)
    .map((str, i) => {
      let [name, link] = str.split("|");
      let rawTgWebAppData = link,
        parts = [];
      if (link.startsWith("https://telegram.blum.codes")) {
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

      if (!tgMap[name]) {
        const referralToken = getNextRefCode();
        console.log(`${name} Use ref code ${referralToken}`);
        const result =
          name +
          "," +
          btoa(
            JSON.stringify({
              initParams: rawTgWebAppData?.trim?.(),
              referralToken,
            })
          ) +
          ",,,,,";
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
