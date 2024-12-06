import { Address } from "@ton/core";
import {
  getHmstr,
  getHmstrAddress,
  nonBounceableFmt,
  sendAllHmstr,
  sendHmstr,
} from "../../utils/balance-ton.js";
import { getTonAddress } from "../../utils/wallet.js";

const DEST = "UQDF87bpgA02s5a92yaog5r0x5-zePGMu00iMVDCxYLbzVPf";
const main = async () => {
  const secret = await getTonAddress(0);
  const address = (await secret?.getWallet())?.address;
  const nonBounceAddress = nonBounceableFmt(address);
  const hmstrAddress = await getHmstrAddress(address);
  console.log(nonBounceAddress);
  console.log(hmstrAddress.toString());

  try {
    let hmstr = await getHmstr(hmstrAddress.toString(), address);
    console.log(hmstr);
    // const result = await sendHmstr(secret, Address.parse(DEST), 10);
    const result = await sendAllHmstr(secret, Address.parse(DEST))
    console.log(result);
    hmstr = await getHmstr(hmstrAddress.toString(), address);
    console.log(hmstr);
  } catch (e) {
    console.error(e);
  }
};

main();
