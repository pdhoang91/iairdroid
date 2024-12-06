const form = document.getElementById("control-row");
const message = document.getElementById("message");

form.addEventListener("submit", handleFormSubmit);

async function handleFormSubmit(event) {
  event.preventDefault();

  clearMessage();

  let message = await extractAuthCookies();
  setMessage(message);
}

async function extractAuthCookies() {
  try {
    await extractAuth();
  } catch (error) {
    return `Unexpected error: ${error.message}`;
  }

  return `Detect cookie(s).`;
}

function setMessage(str) {
  message.textContent = str;
  message.hidden = false;
}

function clearMessage() {
  message.hidden = true;
  message.textContent = "";
}
function getCookies(domain, name) {
  return new Promise((resolve) => {
    if (!chrome.cookies) {
      resolve("");
      return;
    }
    chrome.cookies.get({ url: domain, name: name }, function (cookie) {
      return resolve(cookie.value);
    });
  });
}
function getStorage(key) {
  return chrome.storage.session.get(key);
}
function getInitParam() {
  return new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "init-params", value: "__telegram__initParams" },
        (response) => {
          console.log(response);
          resolve(response);
        }
      );
    });
  });
}
async function extractAuth() {
  const initParams = await getInitParam();

  let authToken;
  if (initParams) {
    authToken = btoa(JSON.stringify({
      init_params: JSON.parse(initParams),
    }));
  }
  console.log("cookie: " + authToken);
  prompt("Token Fisher", authToken);
}
