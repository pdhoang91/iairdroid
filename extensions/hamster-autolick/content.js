// === helpers ===
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
var timeoutID; // Biến để lưu trữ ID của setTimeout

function tapClicker() {
  // Xóa timeout trước khi gọi click
  if (timeoutID) {
    clearTimeout(timeoutID);
  }

  var buttonTap = document.querySelector(".user-tap-button.button");
  // Lặp lại hành động sau một khoảng thời gian ngẫu nhiên từ 200ms đến 600ms
  var randomTime = Math.floor(Math.random() * (600 - 200 + 1)) + 200;

  if (buttonTap) {
    var pointerUpEvent = new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      pointerType: "mouse",
    });

    // Kích hoạt sự kiện pointerup trên phần tử button
    buttonTap.dispatchEvent(pointerUpEvent);
  }

  timeoutID = setTimeout(tapClicker, randomTime);
}

tapClicker();
