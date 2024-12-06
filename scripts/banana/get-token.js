import { login } from "../../utils/banana.js"
import { getAllBananaAddress } from "../../utils/wallet.js"

const accountName = "738 +12134635528"

const main = async() => {
    const secrets = await getAllBananaAddress()
    const secret = secrets.find((val) => val.id == accountName);
    console.log(await login(secret))
    console.log(secret.receiveAddress)
}

main()