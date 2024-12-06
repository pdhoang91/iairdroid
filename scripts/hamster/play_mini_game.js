import {
  claimKeyMiniGame,
  getAccountInfo,
  getMiniGameConfig,
  startKeyMiniGame,
} from "../../utils/hamster.js";
import { randomIntFromInterval, sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllHamsterAddress } from "../../utils/wallet.js";
// import morsejs from "booleanmorse"

const { exec } = newSemaphore(1);

const main = async () => {
  const secrets = await getAllHamsterAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          try {
            const games = await getMiniGameConfig(secret);
            for (const gameName of Object.keys(games)) {
              const game = games[gameName];
              let {
                id,
                isClaimed,
                levelConfig,
                remainSecondsToGuess,
                remainSecondsToNextAttempt,
                startDate,
                maxPoints,
              } = game;
              if (isClaimed) continue;
              switch (gameName) {
                // case "Tiles":
                case "Candles":
                  if (
                    remainSecondsToGuess <= 0 &&
                    remainSecondsToNextAttempt <= 0
                  ) {
                    secret.log(`Start game ${gameName}`);
                    const newData = await startKeyMiniGame(secret, id);
                    console.log(newData)
                    remainSecondsToGuess = newData.remainSecondsToGuess;
                    remainSecondsToNextAttempt =
                      newData.totalSecondsToNextAttempt;
                    startDate = newData.startDate;
                  }
                  if (remainSecondsToGuess > 0) {
                    // resolve cipher
                    secret.log(`Wait 25 seconds until resolve game ${gameName}`);
                    await sleep(25);
                    while (true) {
                      try {
                        const { id: userId } = await getAccountInfo(secret);
                        // const result = btoa(
                        //   `0${randomIntFromInterval(0, 1000000000)}|${userId}`
                        // );
                        let score = maxPoints || 0, sig = 0;
                        const result = btoa(
                          `${new Date(startDate).getTime() / 1e3}|${userId}|${id}|${score}|${sig}`
                        );
                        secret.log(`Resolve game ${gameName} with cipher ${result}`);
                        const data = await claimKeyMiniGame(secret, id, result);
                        console.log(data);
                        secret.log(`Resolve game ${gameName} success`);
                        break;
                      } catch (e) {
                        console.error(e)
                        secret.error(e);
                      }
                    }
                  } else {
                    secret.log(
                      `Wait ${(remainSecondsToNextAttempt / 60).toFixed(
                        1
                      )} minutes to play new game`
                    );
                  }
                  break;
                default:
                  secret.log(`Not support game ${gameName}`);
                  break;
              }
            }
          } catch (e) {
            secret.error(e);
          }
        })
    )
  );
};

main();
