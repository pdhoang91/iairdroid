import {
  parseTgUserFromInitParams,
  randomInt,
  sleep,
} from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { loadYescoinDictionary } from "../../utils/seedphrase-dictionary.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllYescoinAddress } from "../../utils/wallet.js";
import {
  bindInvite,
  getRefCode,
  login,
  newYesCoinClientWithProxy,
} from "../../utils/yescoin.js";

const { exec } = newSemaphore(100);
const MAX_RETRY = 3;
const MAX_REF_PER_ACCOUNT = 100;
const main = async () => {
  const tgMap = {};
  const {getOrEmpty} = loadYescoinDictionary()
  const secrets = await getAllYescoinAddress();
  const refList = (
    await Promise.all(
      secrets.map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              const token = await login(secret);
              const { totalRecords, inviteCode } = await getRefCode(
                secret,
                token
              );
              return {
                totalRecords,
                inviteCode,
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
    .filter(({ totalRecords }) => totalRecords < MAX_REF_PER_ACCOUNT)
    .sort((a, b) => b.totalRecords - a.totalRecords);
  console.log(`Found ${refList.length} ref code!`);
  let i = 0;
  const getNextRefCode = () => {
    const refInfo = refList[i];
    if (!refInfo) return undefined;
    if (refInfo.totalRecords >= MAX_REF_PER_ACCOUNT) {
      i++;
      return getNextRefCode();
    }
    refInfo.totalRecords += 1;
    return refInfo.inviteCode;
  };
  const data = loadFile("config/iframeyescoin.private.txt").toString("utf8");
  const rows = (
    await Promise.all(
      data
        .split("\n")
        .filter((str) => str)
        .map(async (str, i) => {
          let [name, link] = str.split("|");
          if (!link) return;
          let rawTgWebAppData = link,
            parts = [];
          if (link.startsWith("https://www.yescoin.gold")) {
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
            console.log(`Duplicate entries at row ${i + 1} with tg id ${id}`);
            return
          }
          tgMap[id] = true
          let inviteCode, access_token;
          const secret = {
            client: newYesCoinClientWithProxy(),
            privateKey: rawTgWebAppData.trim(),
            log: (msg) => console.log(`${name} ${msg}`),
          };
          await exec(async () => {
            while (true) {
              try {
                if (!inviteCode) {
                  inviteCode = getNextRefCode();
                }
                access_token = await login(secret);
                const { claimAmount } = await bindInvite(
                  secret,
                  access_token,
                  inviteCode
                );
                if (claimAmount) {
                  secret.log(
                    `Using ref code ${inviteCode} SUCCESS! +${claimAmount} Gold`
                  );
                }
                return;
              } catch (e) {
                console.error(e);
                console.log(`${name} ERROR: ${e?.message}`);
              } finally {
                await sleep(randomInt(0.1, 0.5));
              }
            }
          });
          const seedphrase = getOrEmpty(id);
          if (!seedphrase) {
            secret.log(`Missing seedphrase for user ${id}`);
          }
          return {
            entry: name + "," + btoa(JSON.stringify({
              initParams: rawTgWebAppData.trim(),
              token: access_token,
            })) + `,${seedphrase || ""},,,,`,
            missingSeedphrase: seedphrase ? 0 : 1,
          }
        })
    )
  ).filter((str) => str).sort((a, b) => a.missingSeedphrase - b.missingSeedphrase).map(({entry}) => entry);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-yescoin.private.csv", output);
};

main();
