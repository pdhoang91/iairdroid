import { claimMana, getMana } from "../../utils/balance-sei.js";
import { getAllSeiAddress } from "../../utils/wallet.js";

const main = async () => {
  const senders = await getAllSeiAddress();
  for (let i = 0; i < senders.length; i++) {
    const sender = senders[i];
    let mana = await getMana(sender.address);
    console.log(`${i + 1} ${sender.address} ${mana}`);
    const result = await claimMana(sender);
    console.log(result)
    mana = await getMana(sender.address);
    console.log(`${i + 1} ${sender.address} ${mana}`);
  }
};

main();
