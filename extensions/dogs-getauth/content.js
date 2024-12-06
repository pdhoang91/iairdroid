// === helpers ===
var dogsTag;
var DOGS_ID = "dogs-token";
const join = async (queryId, isQueryId = false) => {
  let url = "https://api.onetime.dog/join";
  if (!isQueryId) {
    url = "https://api.onetime.dog/join?invite_hash=2us-VE3WQrGsKXkd07qlag";
  }
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9,vi;q=0.8",
      "content-type": "text/plain;charset=UTF-8",
      // "priority": "u=1, i",
      "sec-ch-ua":
        '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      origin: "https://onetime.dog",
      referer: "https://onetime.dog/",
    },
    referrer: "https://onetime.dog/",
    referrerPolicy: "origin-when-cross-origin",
    body: queryId,
    // "body": "query_id=AAHvTeFKAAAAAO9N4Ur0yCCR&user=%7B%22id%22%3A1256279535%2C%22first_name%22%3A%22Steve%22%2C%22last_name%22%3A%22Le%22%2C%22username%22%3A%22steven_le_28%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1724514579&hash=ee9647823f7425cd9cac155b6580270d636a429873b3fbdd1de1a9951ae7377a",
    method: "POST",
    mode: "cors",
    // "credentials": "omit"
  });
  return await response.json();
};
(function () {
  window.changeHashPlatform = async () => {
    var lochash = location.hash.toString();
    location.hash = lochash;
    const [tgWebAppData] = lochash.split("&");
    const rawTgWebAppData = tgWebAppData.replaceAll("#tgWebAppData=", "");
    if (!dogsTag) {
      dogsTag = window.document.createElement("div");
      dogsTag.setAttribute("id", DOGS_ID);
      window.document.body.appendChild(dogsTag);
    }

    let data;
    if (rawTgWebAppData.startsWith("query_id")) {
      let parts = decodeURIComponent(rawTgWebAppData).split("&");
      data = await join(
        `${parts[0]}&${parts[1]}&${parts[2]}&${parts[3]}`,
        true
      );
    } else {
      data = await join(decodeURIComponent(rawTgWebAppData),false);
    }
    console.log(`Get dogs token success: ${data}`)

    dogsTag.innerHTML = btoa(JSON.stringify(data));
  };
  window.changeHashPlatform();
  addEventListener("hashchange", (event) => {
    window.changeHashPlatform();
  });
})();
