import {
  MIN_FTN_TOKEN_PER_ACCOUNT,
  MIN_FTN_TOKEN_TO_HARVEST,
  MIN_FTN_TO_SEND,
  isAccountDied,
} from "../../config/account.js";
import {
  getFtn,
  getViva,
  sendFtn,
  sendViva,
} from "../../utils/balance-bahamut.js";
import { getAllBahamutAddress } from "../../utils/wallet.js";
import exec from "../../utils/worker.js";

const getGasPerSendTx = () => 0.000032;
const main = async () => {
  let total = 0;
  const accounts = await getAllBahamutAddress();
  const [receiverAccount, ...senders] = accounts;
  await Promise.all(
    senders.map(
      async (sender) =>
        await exec(async () => {
          let [ftn, viva] = await Promise.all([
            getFtn(sender.address),
            getViva(sender.address),
          ]);

          let sendVivaAmount = viva - MIN_FTN_TOKEN_PER_ACCOUNT;
          if (isAccountDied(sender.address)) {
            sendVivaAmount = viva;
          } else if (sendVivaAmount < MIN_FTN_TOKEN_TO_HARVEST) {
            return;
          }
          console.log(
            `\n>> Collect ${sendVivaAmount} VIVA from address ${sender.id} (${sender.address}) FTN=${ftn} VIVA=${viva} to address (${receiverAccount.address})`
          );
          try {
            await sendViva(sender, receiverAccount.address, sendVivaAmount);
            total += sendVivaAmount;
            [ftn, viva] = await Promise.all([
              getFtn(sender.address),
              getViva(sender.address),
            ]);
            console.log(`  ${sender.address} FTN=${ftn} VIVA=${viva}`);
            if (isAccountDied(sender.address)) {
              const sendFtnAmount = ftn - getGasPerSendTx();
              if (sendFtnAmount <= MIN_FTN_TO_SEND / 4) {
                return;
              }
              console.log(
                `\n>> Collect ${sendFtnAmount} FTN from address #${sender.id} (${sender.address}) FTN=${ftn} VIVA=${viva} to address (${receiverAccount.address})`
              );
              await sendFtn(sender, receiverAccount.address, sendFtnAmount);
            }
          } catch (e) {
            console.error(e);
          }
        })
    )
  );

  console.log(`==> Total collect ${total} VIVA!`);
};
main();
