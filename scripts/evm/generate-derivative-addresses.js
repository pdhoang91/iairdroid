import Web3 from "web3"
import { generateEvmDerivativeAddresses } from "../../utils/wallet.js"

const SEED_PHASE = ""

const main = async() => {
    const secrets = await generateEvmDerivativeAddresses(SEED_PHASE, 0, 99)
    secrets.forEach(({privateKey, address}) => console.log(Web3.utils.toChecksumAddress(address)))
}

main()