import { getAllNearAddress, getNearAddress } from "../../utils/wallet.js";
import { getCurrentNear } from "../../utils/balance-near.js";

const main = async () => {
  const receivers = await getAllNearAddress();
  for (let i = 1; i < receivers.length; i++) {
    const receiver = receivers[i];
    try {
      const receiverAccount = await receiver.getAccount();
      const near = await getCurrentNear(receiverAccount);

      console.log(`${i} ${receiver.id} (${near} NEAR)`);
    } catch (e) {
      console.error(e);
    }
  }
};

main();
