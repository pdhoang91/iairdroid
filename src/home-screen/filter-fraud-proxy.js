import { dialog, ipcMain } from "electron";
import fs from "fs";
import { getCountryCode, newProxyClientWithProxy } from "../../utils/proxy.js";
import { newSemaphore } from "../../utils/semaphore.js";
import path from "path";

const { exec } = newSemaphore(300);

export const setup = (window, log) => {
  ipcMain.on("filter-fraud-proxy", async (event) => {
    try {
      const { filePaths } = await dialog.showOpenDialog(window, {
        properties: ["openFile"],
        filters: [
          {
            name: "Text files",
            extensions: ["txt"],
          },
        ],
        message: "Chọn file proxy",
      });
      if (filePaths.length == 0) {
        return;
      }
      const filePath = filePaths[0];
      log(`Đang load dữ liệu từ file ${filePath}`);
      const data = fs.readFileSync(filePath);
      if (!data) {
        log(`Không tìm thấy data từ file ${filePath}`);
        return;
      }
      const secrets = data
        .toString("utf8")
        .split("\n")
        .map((str) => str?.trim?.() || "")
        .filter((proxyStr) => proxyStr)
        .map((proxyStr) => {
          const parts = proxyStr.split(":");
          const proxy = {
            user: parts[2]?.trim?.(),
            passsword: parts[3]?.trim?.(),
            ip: parts[0]?.trim?.(),
            port: parts[1]?.trim?.(),
          };
          console.log(proxy);
          const client = newProxyClientWithProxy(proxy);
          return {
            id: proxy.ip,
            privateKey: proxy.ip,
            client,
            proxyStr,
          };
        });
      const results = (
        await Promise.all(
          secrets.map(async (secret) => {
            let retry = 0;
            while (retry < 3) {
              try {
                log(`(Lần ${retry + 1}) Check proxy ${secret.privateKey}`);
                const { isTrusted } = await exec(() => getCountryCode(secret));
                return { ...secret, isTrusted };
              } catch (e) {
                log(`${secret.id} Lỗi: ${e?.message}`);
              }
              retry++;
            }
            return null;
          })
        )
      )
        .filter((proxy) => proxy)
        .filter(({ isTrusted }) => isTrusted);
      log(`Đã tìm thấy ${results.length} trusted proxy`);
      if (results.length == 0) {
        dialog.showErrorBox("Kết quả", "Đã tìm thấy 0 trusted proxy")
        return;
      }
      const finalResult = results
        .map((secret) => secret?.proxyStr)
        .join("\n");

      const dirPath = path.dirname(filePath);
      const outputFile = path.join(dirPath, "trusted-proxy.txt");
      fs.writeFileSync(outputFile, finalResult, { flag: "w+" });
      log(`Danh sách trusted proxy được lưu ở file ${outputFile}`);
      dialog.showErrorBox("Kết quả", `Đã tìm thấy ${results.length} trusted proxy, kết quả lưu ở file ${outputFile}`)
    } catch (e) {
      log(e);
      console.error(e);
    }
  });
};
