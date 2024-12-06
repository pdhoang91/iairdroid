import { menuTemplate } from "./src/common/menu-template.js";
import { app, Menu, BrowserWindow } from "electron";
import url, { fileURLToPath } from "url";
import path from "path";
import { setup } from "./src/home-screen/home.bg.js";
// import main from '@electron/remote/main'
// main.initialize()
// const remote = require( "@electron/remote/main");
let window;

function createWindow() {
  window = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  window.maximize();
  //   window.webContents.openDevTools();
  setup(window);
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  window.loadURL(
    url.format({
      pathname: path.join(__dirname, "./src/home-screen/home.html"),
      protocol: "file:",
      slashes: true,
      // preload: path.join(__dirname, "./src/home-screen/index.js"),
    })
  );
  //set menu
  const menu = Menu.buildFromTemplate(menuTemplate(window));
  Menu.setApplicationMenu(menu);
}
// initialize()
app.commandLine.appendSwitch("disable-gpu");
app.disableHardwareAcceleration();
app.whenReady().then(() => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
