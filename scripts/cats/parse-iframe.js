import { createUser, getRefCode, getReferralStatus, getUserInfo, isUserExistLocal, newCatsClientWithProxy } from "../../utils/cats.js";
import {
  parseTgUserFromInitParams, randomInt, sleep,
} from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllCatsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(500);
const MAX_RETRY = 1000;
const MAX_REF_PER_ACCOUNT = 10;
const main = async () => {
  const secrets = await getAllCatsAddress();
  const refList = (
    await Promise.all(
      secrets.map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              const referrerCode = await getRefCode(secret)
              const { totalReferents } = await getReferralStatus(secret);
              return {
                totalReferents,
                referrerCode,
              };
            } catch (e) {
              secret.log(`ERROR: ${e?.message}`);
              await sleep(1);
            }
          }
        })
      )
    )
  )
    .filter((val) => val)
    .filter(({ totalReferents }) => totalReferents < MAX_REF_PER_ACCOUNT);
  console.log(`Found ${refList.length} ref code!`);
  let i = 0;
  const getNextRefCode = () => {
    const refInfo = refList[i];
    if (!refInfo) throw new Error("missing ref code");
    if (refInfo.totalReferents >= MAX_REF_PER_ACCOUNT) {
      i++;
      return getNextRefCode();
    }
    refInfo.totalReferents += 1;
    return refInfo.referrerCode;
  };
  const data = loadFile("config/iframecats.private.txt").toString("utf8");
  const rows = (
    await Promise.all(
      data
        .split("\n")
        .filter((str) => str)
        .map(async (str) => {
          let [name, link, proxyStr] = str.split("|");
          if (!link) return;
          let rawTgWebAppData = link,
            parts = [];
          if (link.startsWith("https://cats-frontend.tgapps.store")) {
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
          let referrerCode;
          await exec(async () => {
            while (true) {
              try {
                let proxy;
                if (proxyStr && proxyStr.split(":").length == 4) {
                  const parts = proxyStr.split(":");
                  proxy = {
                    user: parts[2]?.trim?.(),
                    passsword: parts[3]?.trim?.(),
                    ip: parts[0]?.trim?.(),
                    port: parts[1]?.trim?.(),
                  };
                }
                const secret = {
                  client: newCatsClientWithProxy(proxy),
                  privateKey: rawTgWebAppData.trim(),
                  log: (msg) => console.log(`${name} ${msg}`),
                };
                const isUserExist = isUserExistLocal(secret);
                if (isUserExist) return;
                if (!referrerCode) {
                  referrerCode = getNextRefCode();
                }
                await createUser(secret, referrerCode);
                return;
              } catch (e) {
                console.error(e);
                console.log(`${name} ERROR: ${e?.message}`);
              } finally {
                await sleep(randomInt(0.1, 0.5));
              }
            }
          });
          return (
            name + "," + btoa(rawTgWebAppData.trim()) + ",,,,,"
          );
        })
    )
  ).filter((str) => str);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-cats.private.csv", output);
};

main();
