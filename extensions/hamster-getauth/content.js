// === helpers ===
var hamsterTag, memefiTag, spinnerTag;
var HAMSTER_ID = "hamster-token",
  MEMEFI_ID = "memefi-token",
  SPRINNER_ID = "spinner-token";
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
    const [
      tgWebAppData,
    ] = lochash.split("&");
    const rawTgWebAppData = tgWebAppData.replaceAll("#tgWebAppData=", "");
    if (!spinnerTag) {
      spinnerTag = window.document.createElement("div")
      spinnerTag.setAttribute("id", SPRINNER_ID)
      window.document.body.appendChild(spinnerTag)
    }
    spinnerTag.innerHTML = btoa(decodeURIComponent(rawTgWebAppData))
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

function extractAuth() {
  const authToken = window.localStorage.getItem("authToken");
  if (!authToken) {
    setTimeout(extractAuth, 1000);
    return;
  }
  console.log(authToken);
  if (!hamsterTag) {
    hamsterTag = window.document.createElement("div");
    hamsterTag.setAttribute("id", HAMSTER_ID);
    window.document.body.appendChild(hamsterTag);
  }
  hamsterTag.innerHTML = authToken;
}

function extractAuthMemefi() {
  const authToken = window.localStorage.getItem("auth-token1");
  if (!authToken) {
    setTimeout(extractAuthMemefi, 1000);
    return;
  }
  console.log(authToken);
  if (!memefiTag) {
    memefiTag = window.document.createElement("div");
    memefiTag.setAttribute("id", MEMEFI_ID);
    window.document.body.appendChild(memefiTag);
  }
  memefiTag.innerHTML = authToken;
}

extractAuth();
extractAuthMemefi();
