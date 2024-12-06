import { getMana } from "../../utils/balance-sei.js";
import { getAllSeiAddress } from "../../utils/wallet.js";

const main = async () => {
  const receivers = await getAllSeiAddress();
  for (let i = 0; i < receivers.length; i++) {
    const receiver = receivers[i];
    const mana = await getMana(receiver.address);
    console.log(`${receiver.id} ${receiver.address} ${mana}`);
  }
};

main();
