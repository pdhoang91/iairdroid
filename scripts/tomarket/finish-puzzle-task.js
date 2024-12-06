import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { claimPuzzleTask, getPuzzleTask, login } from "../../utils/tomarket.js";
import { getAllTomarketAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(200);
const PUZZLE_RESULT = "4,2,11";

const main = async () => {
  const secrets = await getAllTomarketAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                let access_token = await login(secret);
                const task = await getPuzzleTask(secret, access_token)
                // console.log(task)
                if (task?.status === 0) {
                  secret.log("Claim puzzle task")
                  const data = await claimPuzzleTask(secret, access_token, task?.taskId, PUZZLE_RESULT)
                  // console.log(data)
                  secret.log(`Claim puzzle task success! +${task?.score} TOMATO, ${task?.games} ticket`);
                }
                return;
              } catch (e) {
                secret.error(e);
                if (e?.message == "Invalid Token.") return
                await sleep(1);
              }
            }
          }
        })
    )
  );
};

main();
