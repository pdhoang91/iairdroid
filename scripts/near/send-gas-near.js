import { getAllNearAddress, getNearAddress } from "../../utils/wallet.js";
import { getCurrentNear, sendNear } from "../../utils/balance-near.js";
import { AIRDROP_NEAR_PER_ACCOUNT, MIN_NEAR_PER_ACCOUNT } from "../../config/account.js";

const main = async () => {
  const sender = await getNearAddress(0);
  const receivers = await getAllNearAddress();
  for (let i = 1; i < 101; i++) {
    const receiver = receivers[i];
    try {
      const receiverAccount = await receiver.getAccount();
      const near = await getCurrentNear(receiverAccount);
      if (near >= MIN_NEAR_PER_ACCOUNT) {
        continue
      }
      const sendAmount = AIRDROP_NEAR_PER_ACCOUNT - near;
      console.log(`Sending ${sendAmount} NEAR to account ${receiver.id} (${near} NEAR)`)
      await sendNear(await sender.getAccount(), receiver.id, sendAmount + "");
    } catch (e) {
      console.error(e);
    }
  }
};

//   const response = await personalHotAccount.functionCall({
//     contractId: "game.hot.tg",
//     methodName: "l2_claim",
//     args: {
//       charge_gas_fee: false,
//       mining_time: "270000"
//     },
//   });

main();
