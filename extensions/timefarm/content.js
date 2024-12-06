var timeFarmTag;
var timeFarmID="timefarm-id";
function log(thing) {
  return console.log(`--From Extension: ${thing}`);
}

(function () {
  window.changeHashPlatform = () => {
    var lochash = location.hash.toString();
    log(lochash);

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
    const [
      tgWebAppData,
    ] = lochash.split("&");

    const [_, rawTgWebAppData] = tgWebAppData.split("tgWebAppData=");
    log(rawTgWebAppData);
    if (!timeFarmTag) {
      timeFarmTag = window.document.createElement("div")
      timeFarmTag.setAttribute("id", timeFarmID)
      window.document.body.appendChild(timeFarmTag)
    }
    timeFarmTag.innerHTML = btoa(decodeURIComponent(rawTgWebAppData))
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

