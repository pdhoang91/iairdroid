import { getItemObj, setItem } from "../../config/network.js";
import { getTokenExpirationDate } from "../../utils/helper.js";
import { loadFile } from "../../utils/loader.js";

const FILE_NAME = "yescoin-token.json"
const main = async () => {
    const data = loadFile(FILE_NAME).toString("utf8");
    const dataMap = JSON.parse(data);
    Object.entries(dataMap).forEach(async (entries, i) => {
        const [key, value] = entries;
        try {
            const expireTime = getTokenExpirationDate(value) - new Date()
            const oldValue = getItemObj(key);
            if (oldValue) {
                if (value == oldValue) {
                    console.log(`(${i + 1}) Key ${key} already exist, skip!`);
                    return
                }
                const oldExpireTime = getTokenExpirationDate(oldValue) - new Date();
                if (oldExpireTime > expireTime) {
                    console.log(`(${i + 1}) Key ${key} has less expire time than the old one (${(oldExpireTime / (24 * 60 * 60_000)).toFixed(2)} days), skip!`)
                    return
                }
            }
            console.log(`(${i + 1}) Save key ${key} with expireTime ${(expireTime / (24 * 60 * 60_000)).toFixed(2)} days`)
            setItem(key, value, expireTime)
        } catch (e) {
            // console.log(value)
            console.error(e)
        }
    })
}

main()