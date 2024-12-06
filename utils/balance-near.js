import { formatNearAmount, parseNearAmount } from "near-api-js/lib/utils/format.js";

export const getCurrentNear = async(account) => {
    let res = await account.state()
    const amount = res.amount || 0;
    return parseFloat(formatNearAmount(amount, 10))
}

export const sendNear = async(sender, receiverAddress, amount) => {
    return await sender.sendMoney(receiverAddress, parseNearAmount(amount))
}