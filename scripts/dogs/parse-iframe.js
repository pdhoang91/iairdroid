import { getReference, newDogsClientWithProxy } from "../../utils/dogs.js";
import { loadFile, writeFile } from "../../utils/loader.js";
import { newSemaphore } from "../../utils/semaphore.js";

const { exec } = newSemaphore(20);
const MAX_RETRY = 2;

const main = async () => {
  const secret = { client: newDogsClientWithProxy() };
  const data = loadFile("config/iframedogs.private.txt").toString("utf8");
  const rows = (
    await Promise.all(
      data
        .split("\n")
        .filter((str) => str)
        .map(async (str) => {
          const [name, link] = str.split("|");
          if (!link) return;
          const rawData = link.replaceAll(
            "https://onetime.dog/?tgWebAppStartParam=XNv16qglTHGoaML8LBlaiQ#",
            ""
          );
          const [tgWebAppData] = rawData.split("&");
          const [_, queryId] = tgWebAppData.split("=");
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              // console.log(decodeURIComponent(queryId))
              let data = {};
              data = await exec(() =>
                getReference(secret, decodeURIComponent(queryId))
              );
              return name + "," + btoa(JSON.stringify(data)) + ",,,,,";
            } catch (e) {
              console.log(`${name} ERROR: ${e?.message}`);
            }
          }
        })
    )
  ).filter((str) => str);
  const output = [
    "Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy",
    ...rows,
  ].join("\n");
  writeFile("config/output-dogs.private.csv", output);
};

main();
