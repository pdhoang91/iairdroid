import { ipcMain } from "electron";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import { closeChrome, isRunWithUnsupportedProxy, renewOnInstanceClosed, runAccount, setUnsupportedProxy } from "../../utils/gradient-network.js";
import { sleep } from "../../utils/helper.js";
import { getSeleniumThreads } from "../../utils/os.js";

const threadCount = getSeleniumThreads();

export const setup = (window, fileName) => {
  ipcMain.on(`start-claim-gradient-${fileName}`, async (event) => {
    const secrets = await getSecretsByFileName(fileName);
    event.sender.send(
      `${fileName}-console`,
      `Đã load ${secrets.length} địa chỉ! Chạy với ${threadCount} selenium threads`
    );
    await Promise.all(
      secrets.map(async (secret) => {
        secret = { ...secret };
        secret.log = (msg) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} ${msg}`
          );
          console.log(msg);
        };
        secret.error = (e) => {
          event.sender.send(
            `${fileName}-console`,
            `${secret.id}${secret.proxy ? " (proxy)" : ""} Lỗi${e?.status ? ` (status=${e?.status})` : ""
            }: ${e?.response?.data?.message ||
            e?.data?.message ||
            e?.message ||
            JSON.stringify(e)
            }`
          );
          console.error(e);
        };
        await run(secret);
      })
    );
  });
};

const run = async (secret) => {
  const stopRenew = await renewOnInstanceClosed(secret);
  while (true) {
    try {
      if (isRunWithUnsupportedProxy(secret)) {
        secret.log(`Hủy chạy IP ${secret?.proxy?.ip} vì không được hỗ trợ`);
        stopRenew();
        return
      }
      // if(secret.driver) {
      //   await closeChrome(secret);
      // }
      await runAccount(secret, false)
    } catch (e) {
      secret.error(e);
      if(e?.message == "Unsupported proxy") {
        secret.log(`Hủy chạy IP ${secret?.proxy?.ip} vì không được hỗ trợ`)
        setUnsupportedProxy(secret);
        try {
          stopRenew();
          await closeChrome(secret);
        } catch(e) {
          secret.log(`ERROR: Tắt chromedriver lỗi: ${e?.message}`);
        }
        return
      }
      if (["not reachable", "not connected to DevTools"].find(errMsg => e?.message?.includes?.(errMsg))) {
        secret.log(`Khởi động lại`);
        try {
          stopRenew();
          await closeChrome(secret);
        } catch(e) {
          secret.log(`ERROR: Khởi động lại lỗi: ${e?.message}`);
        }
      }
      await sleep(60);
    }
  }
};
