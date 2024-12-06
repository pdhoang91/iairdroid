// === helpers ===
// var hamsterTag, memefiTag, spinnerTag;
// var HAMSTER_ID = "hamster-token",
//   MEMEFI_ID = "memefi-token",
//   SPRINNER_ID = "spinner-token";
var pixelTag;
var PIXEL_ID="pixel-id";
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
    if (!pixelTag) {
      pixelTag = window.document.createElement("div")
      pixelTag.setAttribute("id", PIXEL_ID)
      window.document.body.appendChild(pixelTag)
    }
    pixelTag.innerHTML = btoa(decodeURIComponent(rawTgWebAppData))
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

// function extractAuth() {
//   const authToken = window.localStorage.getItem("authToken");
//   if (!authToken) {
//     setTimeout(extractAuth, 1000);
//     return;
//   }
//   console.log(authToken);
//   if (!hamsterTag) {
//     hamsterTag = window.document.createElement("div");
//     hamsterTag.setAttribute("id", HAMSTER_ID);
//     window.document.body.appendChild(hamsterTag);
//   }
//   hamsterTag.innerHTML = authToken;
// }

// function extractAuthMemefi() {
//   const authToken = window.localStorage.getItem("auth-token1");
//   if (!authToken) {
//     setTimeout(extractAuthMemefi, 1000);
//     return;
//   }
//   console.log(authToken);
//   if (!memefiTag) {
//     memefiTag = window.document.createElement("div");
//     memefiTag.setAttribute("id", MEMEFI_ID);
//     window.document.body.appendChild(memefiTag);
//   }
//   memefiTag.innerHTML = authToken;
// }

// extractAuth();
// extractAuthMemefi();
