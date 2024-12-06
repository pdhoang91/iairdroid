// === helpers ===
var teleHash;
var tag;
var ID = "spell-token";
(function () {
  window.changeHashPlatform = () => {
    var lochash = location.hash.toString();
    teleHash = lochash;
    const [
      tgWebAppData,
    ] = teleHash.split("&");
    const rawTgWebAppData = tgWebAppData.replaceAll("#tgWebAppData=", "");
    if (!tag) {
      tag = window.document.createElement("div")
      tag.setAttribute("id", ID)
      window.document.body.appendChild(tag)
    }
    tag.innerHTML = btoa(decodeURIComponent(rawTgWebAppData))
  };
  window.changeHashPlatform();
  addEventListener("hashchange", (event) => {
    window.changeHashPlatform();
  });
})();

var index = 0;
var index = 0;
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "init-params" && teleHash) {
    const [
      tgWebAppData,
      tgWebAppVersion,
      tgWebAppPlatform,
      tgWebAppThemeParams,
    ] = teleHash.split("&");
    const rawTgWebAppData = tgWebAppData.replaceAll("#tgWebAppData=", "");
    sendResponse(rawTgWebAppData);
  }
});
