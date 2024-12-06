import { closeChrome, renewOnInstanceClosed, runAccount } from "../../utils/gradient-network.js"
import { sleep } from "../../utils/helper.js"
import { getAllGradientAddress } from "../../utils/wallet.js"

const main = async () => {
  const secrets = await getAllGradientAddress()
  await Promise.all(secrets.map(async (secret) => {
    const stopRenew = await renewOnInstanceClosed(secret);
    while (true) {
      try {
        await runAccount(secret, false)
      } catch (e) {
        console.error(e);
        secret.error(e);
        if(e?.message == "Unsupported proxy") {
          secret.log(`Hủy chạy IP ${secret?.proxy?.ip} vì không được hỗ trợ`)
          try {
            stopRenew();
            await closeChrome(secret);
          } catch(e) {
            secret.log(`ERROR: Khởi động lại lỗi: ${e?.message}`);
          }
          return
        }
        await sleep(1);
      }
    }
  }))
}

main()