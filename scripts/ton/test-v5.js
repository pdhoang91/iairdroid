import { Address } from "@ton/core";
import { getDogs, getDogsAddress, getUsdt, nonBounceableFmt, sendAllDogs, sendDogs } from "../../utils/balance-ton.js";
import { getTonAddress } from "../../utils/wallet.js";

const DEST = "UQDF87bpgA02s5a92yaog5r0x5-zePGMu00iMVDCxYLbzVPf"
const main = async () => {
    const secret = await getTonAddress(4);
    const address = (await secret?.getWalletV5())?.address;
    const nonBounceAddress = nonBounceableFmt(address)
    const dogsAddress = await getDogsAddress(address)
    console.log(nonBounceAddress)
    console.log(dogsAddress.toString())

    let dogs = await getDogs(dogsAddress.toString())
    console.log(dogs)
    // const result = await sendUsdt(secret, Address.parse(DEST), 0.1)
    const result = await sendAllDogs(secret, Address.parse(DEST), true)
    console.log(result)
    dogs = await getDogs(dogsAddress.toString())
    console.log(dogs)

}

main()