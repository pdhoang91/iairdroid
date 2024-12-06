import { Address } from "@ton/core";
import { getTon, getUsdt, getUsdtAddress, sendAllUsdt, sendTon, sendUsdt } from "../../utils/balance-ton.js";
import { getBananaAddress } from "../../utils/wallet.js";

const DEST = "UQDF87bpgA02s5a92yaog5r0x5-zePGMu00iMVDCxYLbzVPf"
const main = async () => {
    const secret = await getBananaAddress(590);
    const address = await secret.address()
    // let tonAmount = await getTon(address)
    // console.log(tonAmount)
    // const result = await sendTon(secret, Address.parse(DEST), 0.05)
    // tonAmount = await getTon(address)
    // console.log(tonAmount)

    const usdtAddress = await secret.getUSDTAddress()
    let usdtAmount = await getUsdt(usdtAddress.toString())
    console.log(usdtAmount)
    // const result = await sendUsdt(secret, Address.parse(DEST), 0.1)
    const result = await sendAllUsdt(secret, Address.parse(DEST))
    console.log(result)
    usdtAmount = await getUsdt(usdtAddress.toString())
    console.log(usdtAmount)

}

main()