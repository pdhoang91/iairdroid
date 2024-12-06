import { ipcMain } from "electron";
import {
  getAddressListByFileName,
  getSecretsByFileName,
} from "../../config/secret-manager.js";

export const setup = (window, fileName) => {
  window.webContents.send("setup", fileName);
  ipcMain.on(`get-address-list-${fileName}`, async (event) => {
    const secrets = await getSecretsByFileName(fileName);
    const args = secrets.map(({ address, privateKey, id, proxy, teleInitParams }) => {
      const result = { address, privateKey, id, proxy, teleInitParams }
      if (fileName.endsWith("hamster.private.csv")) {
        result.address = null
      }
      return result
    })
    event.sender.send(
      `get-address-list-${fileName}`,
      args
    );
  });
};
