// === helpers ===
var teleHash;
(function () {
  window.changeHashPlatform = () => {
    var lochash = location.hash.toString();

    if (lochash.indexOf("tgWebAppPlatform=weba") !== -1) {
      lochash = lochash.replaceAll(
        "tgWebAppPlatform=weba",
        "tgWebAppPlatform=android"
      );
    } else if (lochash.indexOf("tgWebAppPlatform=web") !== -1) {
      lochash = lochash.replaceAll(
        "tgWebAppPlatform=web",
        "tgWebAppPlatform=android"
      );
    }
    location.hash = lochash;
    teleHash = lochash;
    if (index == 0) {
      location.reload();
      index = 1;
    }
  };
  window.changeHashPlatform();
  addEventListener("hashchange", (event) => {
    window.changeHashPlatform();
  });
})();

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
    const rawParams = decodeURIComponent(rawTgWebAppData).split("&");
    const finalInitParams = rawParams.reduce((acc, rawParam) => {
      const [param, data] = rawParam.split("=");
      acc[param] = decodeURIComponent(data);
      return acc;
    }, {});
    sendResponse(JSON.stringify(finalInitParams));
  }
});
