import {
  completeTask,
  createUser,
  getReferralStatus,
  getTasks,
  getTasksBiget,
  getTasksKucoin,
  getTasksOkx,
} from "../../utils/cats.js";
import { sleep } from "../../utils/helper.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllCatsAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(300);
const QUESTION_MAP = {
  146: "dip",
  141: "dildo",
  148: "AIRNODE",
  149: "WEI",
  153: "ABSTRACT",
  154: "AUCTION",
  155: "AUDIT",
  158: "AFFILIATE",
  159: "BAG",
  160: "ALTCOIN",
  161: "BAKING",
  162: "ALPHA",
  163: "BAKERS",
  164: "ASIC",
  165: "BITPAY",
  166: "BIT",
  168: "BITS",
  169: "MAINNET",
  172: "MARKET",
  174: "LAMBO",
  175: "LEDGER",
  176: "BITCOINER",
  177: "BITSTREAM",
}

const main = async () => {
  const secrets = await getAllCatsAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                await createUser(secret);
                const { tasks } = await getTasks(secret);
                // console.log(tasks)
                const { tasks: bigetTasks } = await getTasksBiget(secret);
                const { tasks: okxTasks } = await getTasksOkx(secret);
                const { tasks: kucoinTasks } = await getTasksKucoin(secret);
                const { totalReferents } = await getReferralStatus(secret);
                const incompleteTasks = [...tasks, ...bigetTasks, ...okxTasks, ...kucoinTasks].filter((task) => !task.completed);

                secret.log(`Found ${incompleteTasks.length} uncompleted tasks`);
                for (const task of incompleteTasks) {
                  if (
                    [
                      "SUBSCRIBE_TO_CHANNEL",
                      "NICKNAME_CHANGE",
                      "BOOST_CHANNEL",
                      "ACTIVITY_CHALLENGE"
                    ].includes(task.type)
                  )
                    continue;
                  if (
                    task.type == "INVITE_FRIENDS" &&
                    totalReferents < task.params.friendsCount
                  )
                    continue;
                  secret.log(`Làm nhiệm vụ "${task.title}"`);
                  const { success } = await completeTask(secret, task.id, QUESTION_MAP[task.id]);
                  if (success) {
                    secret.log(
                      `Làm nhiệm vụ "${task.title}" thành công! +${task.rewardPoints} CATS`
                    );
                  }
                }
                return;
              } catch (e) {
                // console.error(e)
                // secret.error(e);
                secret.log(`ERROR: ${e?.message}`);
                await sleep(1);
              }
            }
          }
        })
    )
  );
};

main();
