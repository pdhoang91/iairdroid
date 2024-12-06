import {
  MIN_FTN_TOKEN_PER_ACCOUNT,
  MIN_FTN_TOKEN_TO_HARVEST,
  MIN_FTN_TO_SEND,
  isAccountDied,
} from "../../config/account.js";
import {
  getDzook,
  getFtn,
  sendDzook,
  sendFtn,
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
          let [ftn, dzook] = await Promise.all([
            getFtn(sender.address),
            getDzook(sender.address),
          ]);

          let sendDzookAmount = dzook - MIN_FTN_TOKEN_PER_ACCOUNT;
          if (isAccountDied(sender.address)) {
            sendDzookAmount = dzook;
          } else if (sendDzookAmount < MIN_FTN_TOKEN_TO_HARVEST) {
            return;
          }
          console.log(
            `\n>> Collect ${sendDzookAmount} DZOOK from address ${sender.id} (${sender.address}) FTN=${ftn} DZOOK=${dzook} to address (${receiverAccount.address})`
          );
          try {
            await sendDzook(sender, receiverAccount.address, sendDzookAmount);
            total += sendDzookAmount;
            [ftn, dzook] = await Promise.all([
              getFtn(sender.address),
              getDzook(sender.address),
            ]);
            console.log(`  ${sender.address} FTN=${ftn} DZOOK=${dzook}`);
            if (isAccountDied(sender.address)) {
              const sendFtnAmount = ftn - getGasPerSendTx();
              if (sendFtnAmount <= MIN_FTN_TO_SEND / 4) {
                return;
              }
              console.log(
                `\n>> Collect ${sendFtnAmount} FTN from address #${sender.id} (${sender.address}) FTN=${ftn} DZOOK=${dzook} to address (${receiverAccount.address})`
              );
              await sendFtn(sender, receiverAccount.address, sendFtnAmount);
            }
          } catch (e) {
            console.error(e);
          }
        })
    )
  );

  console.log(`==> Total collect ${total} DZOOK!`);
};
main();
