import { getReward, newDogsClientWithProxy } from "../../utils/dogs.js";
import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { loadFile } from "../../utils/loader.js";
import { newSemaphore } from "../../utils/semaphore.js";

const { exec } = newSemaphore(100);
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
          const [name, tgWebAppData] = str.split("|");
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++;
            try {
              const { id } = parseTgUserFromInitParams(tgWebAppData);
              let reward = await exec(() =>
                getReward({ ...secret, privateKey: { telegram_id: id } })
              );
              return {
                name,
                reward,
              };
            } catch (e) {
              // console.error(e)
              if (e?.response?.status == 404) {
                console.log(`${name} ERROR: ${e?.response?.data?.trim?.()}`);
                return
              }
              console.log(`${name} ERROR: ${e?.message}`);
            }
          }
        })
    )
  )
    .filter((str) => str)
    .forEach(({ name, reward }) => console.log(`${name},${reward}`));
};

main();
