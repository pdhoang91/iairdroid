import { dialog, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { getYescoinAuthMap } from "../../utils/yescoin.js";

export const setup = (window, log) => {
  ipcMain.on("export-yescoin-auth", async (event) => {
    try {
      const { filePaths } = await dialog.showOpenDialog(window, {
        properties: ["openDirectory"],
        filters: [],
        message: "Chọn thư mục sẽ lưu file token",
      });
      const dirPath = filePaths[0];
      if (!dirPath) {
        dialog.showErrorBox("Không thấy thư mục", `Không có thư mục nào được chọn`)
        return
      }
      const keys = getYescoinAuthMap()
      const keyLength = Object.keys(keys).length;
      log(`Đã tìm thấy ${keyLength} token!`);
      const finalResult = JSON.stringify(keys);
      const outputFile = path.join(dirPath, "yescoin-token.json");
      fs.writeFileSync(outputFile, finalResult, { flag: "w+" });
      log(`Đã lưu ${keyLength} token ở file ${outputFile}`);
      dialog.showErrorBox("Kết quả", `Đã tìm thấy ${keyLength} token, kết quả lưu ở file ${outputFile}`)
    } catch (e) {
      log(e);
      console.error(e);
    }
  });
};
