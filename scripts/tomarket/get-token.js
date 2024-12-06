
import { login } from "../../utils/tomarket.js";
import { getAllTomarketAddress } from "../../utils/wallet.js"

const accountName = "1- +84824902996"

const main = async() => {
    const secrets = await getAllTomarketAddress()
    const secret = secrets.find((val) => val.id == accountName);
    console.log(await login(secret))
}

main()