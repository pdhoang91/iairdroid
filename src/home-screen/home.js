let $ = require("jquery");
let { ipcRenderer, clipboard } = require("electron");
const { newConsole } = require("../common/console.cjs");

const onConsole = newConsole("#main-console", 100)

var loadButton;
$(function () {
  var area = $("#top-bar");
  loadButton = area.find("button[name='load-config-btn']");
  loadButton.on("click", () => {
    ipcRenderer.send("load-config");
  });
  let filterFraudProxyButton = area.find("button[name='filter-fraud-proxy-btn']");
  filterFraudProxyButton.on("click", () => {
    ipcRenderer.send("filter-fraud-proxy");
  });

  let exportYescoinAuthButton = area.find("button[name='export-yescoin-token-btn']");
  exportYescoinAuthButton.on("click", () => {
    ipcRenderer.send("export-yescoin-auth");
  });
});

ipcRenderer.on("load-config", (event, files = []) => {
  var area = $("#top-bar");
  files.map((file) => {
    const btn = $(`<button class="btn btn-primary">${file}</button>`);
    btn.on("click", () => {
      ipcRenderer.send("open-cron-window", file);
    });
    area.append(btn);
  });
  loadButton.hide()
});
ipcRenderer.on("main-console", (event, log) => {
  onConsole(log);
});

module.exports = {};
