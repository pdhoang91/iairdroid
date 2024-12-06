import {
  addRefferal,
  checkTasks,
  getHamsterSync,
  getTgUserId,
  login,
  newHamsterClientWithProxy,
  selectExchange,
} from "../../utils/hamster.js";
import { parseTgUserFromInitParams, randomInt, sleep } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { loadHamsterDictionary } from "../../utils/seedphrase-dictionary.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const MAX_RETRY = 3;
const MAX_REF_PER_ACCOUNT = 200;
const main = async () => {
  const tgMap = {};
  const {getOrEmpty} = loadHamsterDictionary()
  const secrets = await getAllHamsterAddress();
  const refList = (
    await Promise.all(
      secrets.map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              const { referralsCount } = await getHamsterSync(secret);
              const tgId = await getTgUserId(secret);
              return {
                referralsCount,
                tgId,
              };
            } catch (e) {
              // console.error(e);
              secret.error(e);
              if (e?.response?.status == 401) {
                return
              }
              await sleep(1);
            }
          }
        })
      )
    )
  )
    .filter((val) => val)
    .filter(({ referralsCount }) => referralsCount < MAX_REF_PER_ACCOUNT);
  console.log(`Found ${refList.length} ref code!`);
  let i = 0;
  const getNextRefCode = () => {
    const refInfo = refList[i];
    if (!refInfo) throw new Error("missing ref code")
    if (refInfo.referralsCount >= MAX_REF_PER_ACCOUNT) {
      i++;
      return getNextRefCode();
    }
    refInfo.referralsCount += 1;
    return refInfo.tgId;
  };
  const data = loadFile("config/iframehamster.private.txt").toString("utf8");
  const rows = (
    await Promise.all(
      data
        .split("\n")
        .filter((str) => str)
        .map(async (str) => {
          let [name, link, proxyStr] = str.split("|");
          let rawTgWebAppData = link, parts = [];
          if (link.startsWith("https://hamsterkombatgame") || link.startsWith("https://app.hamsterkombatgame.io")) {
            rawTgWebAppData = decodeURIComponent(rawTgWebAppData.split("#")[1].split("=")[1])
            for(const part of rawTgWebAppData.split("&")) {
              try {
                if (part.startsWith("hash")) break
              } finally {
                parts.push(part)
              }
            }
            rawTgWebAppData = parts.join("&");
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
          const {id} = parseTgUserFromInitParams(rawTgWebAppData)
          if (tgMap[id]) {
            console.log(`Duplicate record at row ${i + 1} with name ${name}`);
            return
          }
          tgMap[id] = true;
          if (!name) {
            name = id;
          }
          let token, refId;
          await exec(async () => {
            let retry = 0;
            while (retry < MAX_RETRY * 2) {
              retry++;
              try {
                if (!refId) {
                  refId = getNextRefCode();
                }
                const secret = {
                  client: newHamsterClientWithProxy(proxy),
                  privateKey: rawTgWebAppData.trim(),
                  log: (msg) => console.log(`${name} ${msg}`),
                };
                token = await login(secret, rawTgWebAppData);
                secret.privateKey = token;
                try {
                  secret.log(`Add ref for user ${refId}`);
                  await addRefferal(secret, refId);
                  secret.log(`Add ref for user ${refId} SUCCESS!`);
                } catch (e) {
                  if (e?.response?.data?.error_code == "Already_Exist_Referrer") {
                    secret.log("Không thể gắn link ref")
                  } else {
                    console.log(`${name} REF ERROR: ${JSON.stringify(e?.response?.data || e?.message)}`);
                  }
                }
                const sync = await getHamsterSync(secret);
                const { exchangeId } = sync;
                if (!exchangeId) {
                  secret.log("select exchange");
                  await selectExchange(secret);
                  await checkTasks(secret);
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
            console.log(`Missing seedphrase for user ${id}`)
          }

          return {
            entry: name + "," + token + `,${seedphrase},,,,${proxyStr || ""}`,
            missingSeedphrase: seedphrase ? 0 : 1,
          }
        })
    )
  ).filter((str) => str).sort((a, b) => a.missingSeedphrase - b.missingSeedphrase).map(({entry}) => entry);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-hamster.private.csv", output);
};

main();
