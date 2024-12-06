import { sleep } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { getRefInfo } from "../../utils/lost-dog.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllLostDogAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(500);
const MAX_REF_PER_ACCOUNT = 1;
const DEFAULT_REF_CODE = "ref-u_1256279535__s_577692";
const MAX_RETRY = 3;
const main = async () => {
  const secrets = await getAllLostDogAddress();
  const refList = (
    await Promise.all(
      secrets.map((secret) =>
        exec(async () => {
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              return await getRefInfo(secret);
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
    .filter(
      ({ invitedPeopleCount }) => invitedPeopleCount < MAX_REF_PER_ACCOUNT
    );
  console.log(`Found ${refList.length} ref code!`);
  let i = 0;
  const getNextRefCode = () => {
    const refInfo = refList[i];
    if (!refInfo) return DEFAULT_REF_CODE;
    if (refInfo.invitedPeopleCount >= MAX_REF_PER_ACCOUNT) {
      i++;
      return getNextRefCode();
    }
    refInfo.invitedPeopleCount += 1;
    return refInfo.refCode;
  };
  const data = loadFile("config/iframelostdog.private.txt").toString("utf8");
  const rows = data
    .split("\n")
    .filter((str) => str)
    .map((str, i) => {
      let [name, rawTgWebAppData] = str.split("|");
      if (rawTgWebAppData.includes("start_param=ref-u_1256279535__s_577692")) {
        const refCode = getNextRefCode();
        console.log(`${i + 1}. Use ref code ${refCode} for ${name}`);
        rawTgWebAppData = rawTgWebAppData.replaceAll(
          "start_param=ref-u_1256279535__s_577692",
          `start_param=${refCode}`
        );
      }
      return name + "," + btoa(rawTgWebAppData.trim()) + ",,24/5/2025,20,0,";
    })
    .filter((str) => str);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-lostdog.private.csv", output);
};

main();
