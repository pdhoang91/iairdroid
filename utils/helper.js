import { getItemObj, setItem } from "../config/network.js";

export const sleep = (delay) =>
  new Promise((resolve) => setTimeout(resolve, delay * 1000));

export const sleepMs = (delay) =>
  new Promise((resolve) => setTimeout(resolve, delay));

export const toHHMMSS = (secs) => {
  var sec_num = parseInt(secs, 10); // don't forget the second param
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  var seconds = sec_num - hours * 3600 - minutes * 60;

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds;
};

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function parseTgUserFromInitParams(initParams, raw = false) {
  if (!initParams) return {}
  if (initParams?.startsWith("query_id")) {
    const [query_id, _] = initParams.split("&")
    initParams = initParams.replaceAll(query_id + "&", "")
  }
  const userRaw = decodeURIComponent(initParams).split("&")[0].split("=")[1];
  if (raw) return userRaw;
  const { id, first_name, last_name, username } = JSON.parse(userRaw);
  return {
    id,
    first_name,
    last_name,
    username,
  };
}

export function addUsernameToInitParams(initParams) {
  const {id, username} = parseTgUserFromInitParams(initParams)
  if (username) return initParams;
  initParams = initParams.replaceAll(encodeURIComponent(`"id":${id}`), encodeURIComponent(`"id":${id},"username":"${id}_user"`))
  console.log(initParams)
  return initParams;
}

export function isTokenExpired(token) {
  const {exp} = JSON.parse(atob(token.split(".")[1]));
  const expiredDate = new Date(exp * 1000)
  return expiredDate <= new Date()
}

export function getTokenExpirationDate(token, fieldName = "exp") {
  const body = JSON.parse(atob(token.split(".")[1]));
  return new Date(body[fieldName] * 1000)
}

export function getJwtBody(token) {
  const body = JSON.parse(atob(token.split(".")[1]));
  return body;
}

export const getCloudflareCookie = (res) => getResponseCookie(res, [], "__cf_bm")

export const isCloudflareCookieValid = (cfbmValue) => {
  const {expireTime} = getResponseCookie(null, [cfbmValue], "__cf_bm")
  if (!expireTime) return true
  return new Date() < expireTime;
}

export const getResponseCookie = (res, cookieList = [], expectedCookie) => {
  if (cookieList?.length == 0) {
    cookieList = res.headers["set-cookie"];
  }
  const foundCookies = cookieList.map((cookies) => {
    const cookiesParts = cookies.split(";");
    const [first] = cookiesParts;
    const expireTimeStr = cookiesParts.find((val) => val.split("=")[0]?.trim?.() == "expires")
    const [cookieName, value] = first.split("=");
    if (cookieName != expectedCookie) return null
    let expireTime = expireTimeStr ? new Date(Date.parse(expireTimeStr.split("=")[1])) : null;
    return {
      cookieName,
      value,
      expireTime,
      cookies
    };
  }).filter(val => val).find(({cookieName}) => cookieName == expectedCookie);

  return foundCookies
};

export const JSONStringtify = (obj) => {
  if (!obj) return null
  return JSON.stringify(obj)
}

export const toFixedRoundDown = (val, decimal) => {
  let tmp = 10 ** decimal;
  return Math.floor(val * tmp) / tmp
}

export const isDone = (key) => getItemObj(key);
export const setDone = (key, expireTime = 4 * 60 * 60_000, val = true) => setItem(key, val, expireTime)