const openTokenTableForm = document.getElementById("open-token-table");
const exportSeedphaseForm = document.getElementById("export-seedphase");

openTokenTableForm.addEventListener("submit", openTokenTableHandler);
exportSeedphaseForm.addEventListener("submit", exportSeedphaseHandler);

async function openTokenTableHandler(event) {
  event.preventDefault();
  await callAction("open-token-table");
}

async function exportSeedphaseHandler(event) {
  event.preventDefault();
  const data = await callAction("export-seedphase");
  if (data) {
    download(data, "data");
  }
}

async function callAction(action) {
  return await new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: action },
        {},
        (data) => {
          resolve(data);
        }
      );
    });
  });
}

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
