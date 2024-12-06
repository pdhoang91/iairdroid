import { getYescoinAuthMap } from "../../utils/yescoin.js"

const main = async() => {
    const keys = getYescoinAuthMap()
    console.log(JSON.stringify(keys))
}

main()