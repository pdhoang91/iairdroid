import { MIN_FTN_PER_ACCOUNT, MIN_FTN_TO_AIRDROP } from "../../config/account.js";
import { getDzook, getFtn, sendFtn } from "../../utils/balance-bahamut.js";
import { getAllBahamutAddress, getBahamutAddress } from "../../utils/wallet.js";

const main = async () => {
  const sender = await getBahamutAddress(0);
  const receivers = await getAllBahamutAddress();

  for (let i = 1; i < receivers.length; i++) {
    const receiver = receivers[i];
    const { id, address } = receiver;

    let [ftn, dzook] = await Promise.all([getFtn(address), getDzook(address)]);
    if (dzook > 0 && ftn < MIN_FTN_PER_ACCOUNT) {
      // send gas
      const amount = MIN_FTN_PER_ACCOUNT - ftn;
      if (amount < MIN_FTN_TO_AIRDROP) {
        continue;
      }
      console.log(
        `\nSending ${amount} FTN to address ${id} (${address}) FTN=${ftn} DZOOK=${dzook}`
      );
      try {
        await sendFtn(sender, address, amount);
      } catch (e) {
        console.error(e);
      }
    }
  }
};
main();
