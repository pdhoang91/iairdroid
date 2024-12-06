import {
  parseTgUserFromInitParams,
  randomInt,
  sleep,
} from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import {
  getRefferalCode,
  isLoginBefore,
  login,
  newPawsClientWithProxy,
} from "../../utils/paws.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllPawsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const MAX_RETRY = 10;
const MAX_REF_PER_ACCOUNT = 10;

const main = async () => {
  const secrets = await getAllPawsAddress();
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
              const referralData = await getRefferalCode(secret);
              if (!referralData) return;
              console.log(referralData);
              const { referralsCount, code } = referralData;
              return {
                referralsCount,
                code,
              };
            } catch (e) {
              // console.error(e);
              secret.log(`ERROR: ${e?.message}`);
              await sleep(1);
            }
          }
        })
      )
    )
  )
    .filter((val) => val)
    .filter(({ referralsCount }) => referralsCount < MAX_REF_PER_ACCOUNT)
    .sort((a, b) => b.referralsCount - a.referralsCount);
  console.log(`Found ${refList.length} ref code!`);
  let i = 0;
  const getNextRefCode = () => {
    const refInfo = refList[i];
    if (!refInfo) {
      console.warn("Running out of ref code, use undefined");
      return undefined;
    }
    if (refInfo.referralsCount >= MAX_REF_PER_ACCOUNT) {
      i++;
      return getNextRefCode();
    }
    refInfo.referralsCount += 1;
    return refInfo.code;
  };
  const data = loadFile("config/iframepaws.private.txt").toString("utf8");
  const rows = (
    await Promise.all(
      data
        .split("\n")
        .filter((str) => str)
        .map(async (str, i) => {
          let [name, link, proxyStr] = str.split("|");
          let rawTgWebAppData = link,
            parts = [];
          if (link.startsWith("https://app.paws.community")) {
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

          if (!tgMap[name]) {
            await exec(async () => {
              const secret = {
                client: newPawsClientWithProxy(proxy),
                privateKey: rawTgWebAppData.trim(),
                log: (msg) => console.log(`${name} ${msg}`),
              };
              if (isLoginBefore(secret)) {
                return;
              }
              secret.referralCode = getNextRefCode();
              let retry = 0;
              while (retry < MAX_RETRY) {
                try {
                  retry++;
                  await login(secret);
                  return;
                } catch (e) {
                  // console.error(e);
                  console.log(`${name} ERROR: ${e?.message}`);
                } finally {
                  await sleep(randomInt(0.1, 0.5));
                }
              }
            });
            const result = name + "," + btoa(rawTgWebAppData?.trim?.()) + ",,,,,";
            tgMap[name] = result;
            return result;
          } else {
            console.log(`Duplicate record at row ${i + 1} with name ${name}`);
          }
        })
    )
  ).filter((str) => str);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-paws.private.csv", output);
};

main();
