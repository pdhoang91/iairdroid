import { getSpellClaimData, getSpellSetting, isSpellClaimable } from "../../utils/balance-sei.js"
import { claimSpellBatchMode, getSpellUser, getTask, waitUntilTaskDone } from "../../utils/spell.js"
import { getSpellAddress } from "../../utils/wallet.js"

const main = async () => {
    const secret = await getSpellAddress(0)
    const user = await getSpellUser(secret)
    console.log(user)
    const tasks = await getTask(secret)
    console.log(tasks)
    const claimData = await isSpellClaimable(user.address)
    console.log(claimData)
    if (claimData.claimable) {
        await claimSpellBatchMode(secret)
    }
}

main()