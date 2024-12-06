let $ = require("jquery");
let { ipcRenderer } = require("electron");
const { newConsole } = require("../common/console.cjs");

const onConsole = newConsole("#main-console");

ipcRenderer.on("setup", (event, fileName) => {
  ipcRenderer.on(`${fileName}-console`, (event, log) => {
    onConsole(log);
  });
  
  ipcRenderer.send(`start-claim-yescoin-${fileName}`);
});

module.exports = {};
