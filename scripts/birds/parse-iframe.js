import { getOrCreateUser, getRefferalId, getRefferalList, isUserCreated, newBirdsClientWithProxy } from "../../utils/birds.js";
import {
  parseTgUserFromInitParams,
  randomInt,
  sleep,
} from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBirdsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(100);
const { exec: refExec } = newSemaphore(100);
const MAX_RETRY = 3;
const MAX_REF_PER_ACCOUNT = 50;
const main = async () => {
  const secrets = await getAllBirdsAddress();
  const refList = (
    await Promise.all(
      secrets.map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              const referId = await getRefferalId(secret);
              const { total } = await getRefferalList(secret);
              return {
                total,
                referId,
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
    .filter(({ total }) => total < MAX_REF_PER_ACCOUNT);
  console.log(`Found ${refList.length} ref code!`);
  let i = 0;
  const getNextRefCode = () => {
    const refInfo = refList[i];
    if (!refInfo) throw new Error("missing ref code");
    if (refInfo.total >= MAX_REF_PER_ACCOUNT) {
      i++;
      return getNextRefCode();
    }
    refInfo.total += 1;
    return refInfo.referId;
  };
  const data = loadFile("config/iframebirds.private.txt").toString("utf8");
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
          if (link.startsWith("https://birdx.birds.dog")) {
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
          const secret = {
            client: newBirdsClientWithProxy(proxy),
            privateKey: rawTgWebAppData.trim(),
            log: (msg) => console.log(`${name} ${msg}`),
          };
          await refExec(async () => {
            while (true) {
              try {
                const userCreated = await isUserCreated(secret)
                if (userCreated) return
                if (!secret.referId) {
                  secret.referId = getNextRefCode();
                }
                await getOrCreateUser(secret);
                return;
              } catch (e) {
                // console.error(e);
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
  writeFile("config/output-birds.private.csv", output);
};

main();
