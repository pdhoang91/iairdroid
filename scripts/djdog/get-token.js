
import { login } from "../../utils/djdog.js";
import { getAllDjDogAddress } from "../../utils/wallet.js"

const accountName = "doitac-16"

const main = async() => {
    const secrets = await getAllDjDogAddress()
    const secret = secrets.find((val) => val.id == accountName);
    console.log(await login(secret))
    console.log(secret.receiveAddress)
}

main()