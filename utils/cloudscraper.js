import axios from "axios";
import { CookieJar } from "tough-cookie";
import { getPlatform } from "./platform.js";
import path, { join as joinPath, resolve } from 'path';
import { spawn } from 'child_process';
import { newSemaphore } from "./semaphore.js";
import fs from "fs"
import { downloadFile } from "./loader.js";
import electron from "electron";
import { isDone, setDone, sleep } from "./helper.js";
import { BINARY_LOCATION } from "../config/network.js";
import { isElectronApp } from "./electron.js";

const GIT_LOCATION = "https://raw.githubusercontent.com/namlt2882/wave-management-tool/master/assets/bin";
const BIN_VERSION = "v4";
const CLOUDSCRAPER_ALIVE_TIME = 60 * 60_000; // 60 mins
const cloudscraperAliveKey = "cloudscraper_alive";
const cloudscraperAliveFromKey = "cloudscraper_alive_from";
const { exec: aliveExec } = newSemaphore(1)
const { exec: scExec } = newSemaphore(25);

export const getExecCmd = () => {
  const platform = getPlatform()
  let fileName = (version) => version ? `cs-${version}` : "cs"
  switch (platform) {
    case "win":
      fileName = (version) => version ? `cs-${version}.exe` : "cs.exe"
      break
  }
  if (isElectronApp) {
    return {
      cmd: joinPath(resolve(BINARY_LOCATION), `${platform}/${fileName(BIN_VERSION)}`),
      gitLocation: `${GIT_LOCATION}/${platform}/${fileName(BIN_VERSION)}`,
    }
  }
  return {
    cmd: joinPath(resolve("./cloudscraper/distribution"), `${platform}/${fileName()}`),
    gitLocation: `${GIT_LOCATION}/${platform}/${fileName(BIN_VERSION)}`,
  }
}

const alive = async (secret, server) => await aliveExec(async () => {
  const { cmd: execCmd, gitLocation } = getExecCmd();
  const platform = getPlatform()
  try {
    if(isDone(cloudscraperAliveKey)) return true
    await scExec(() => server.get("/health"));
    if (!isDone(cloudscraperAliveFromKey)) {
      secret.log("Tắt cloudscraper khởi động lại");
      await scExec(() => server.get("/exit"));
      return await alive(secret, server);
    }
    setDone(cloudscraperAliveKey, 10_000);
    return true
  } catch (e) {
    secret.log("Cloudscraper chưa bật");
    if (!fs.existsSync(execCmd)) {
      secret.log(`Không tìm thấy, tải file ${gitLocation}`)
      await downloadFile(gitLocation, execCmd);
    }
    if (platform != "win") {
      fs.chmodSync(execCmd, '755')
    }
    secret.log(`Chạy lệnh '${execCmd}'`)
    try {
      await scExec(() => server.get("/exit"));
    } catch(e) {
      secret.error(e)
    }
    let done = false;
    await Promise.all([
      new Promise(async(resolve, reject) => {
        try {
          let cp;
          if (isElectronApp) {
            // cp = ElectronSpawn()
            cp = spawn(execCmd, { env: { "ELECTRON_RUN_AS_NODE": "1" } })
          } else {
            cp = spawn(execCmd)
          }
          cp.stdout.once('data', (data) => {
            secret.log("Cloudscraper đã bật");
            done = true;
            resolve()
          });
  
          cp.stderr.on('data', (data) => {
            if (!done) reject(data.toString())
            // console.error(data.toString());
          });
  
          cp.on('exit', (code) => {
            if (!done) reject(`Cloudscraper server exited with code ${code}`)
            secret.log(`Cloudscraper server exited with code ${code}`);
          });
          while(true) {
            if (done) {
              resolve()
              return
            }
            await sleep(1);
          }
        } catch (e) {
          reject(e)
        }
      }),
      new Promise(async(resolve, reject) => {
        let retry = 0;
        await sleep(5);
        while(retry < 20) {
          retry++;
          try {
            await scExec(() => server.get("/health"));
            secret.log(`Server is online (${retry})`)
            done = true;
            resolve()
            return
          } catch(e) {
            secret.log(`Server not online (${retry})`)
          }
          await sleep(5)
        }
        reject('maximum retry');
      })
    ])
    setDone(cloudscraperAliveFromKey, CLOUDSCRAPER_ALIVE_TIME);
    setDone(cloudscraperAliveKey, 10_000);
  }
})

export const newCloudScraperClientWithProxy = (secret, proxy, log = console.log) => {
  const jar = new CookieJar();
  const server = axios.create({
    baseURL: "http://localhost:9999",
    jar,
  })
  let proxies = {}
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    proxies.https = proxyStr;
  }
  const doRequest = async (method, url, body = null, headers = {}, withInterceptorIdHeader = false) => {
    await alive(secret, server);
    const params = {
      method,
      url,
      headers,
      body,
      proxy: proxies,
      with_interceptor_id_header: withInterceptorIdHeader
    }
    try {
      return await scExec(() => server.post("/api", params))
    } catch(e) {
      if (
        e?.response?.data?.includes?.("Either the server is overloaded or there is an error in the application") ||
        e?.message?.includes?.("ECONNREFUSED")
      ) {
        secret.log("Server quá tải, tắt khởi động lại");
        setDone(cloudscraperAliveFromKey, CLOUDSCRAPER_ALIVE_TIME, false);
        setDone(cloudscraperAliveKey, 10_000, false);
        try {
          await aliveExec(() => server.get("/exit"));
        } catch(e) {
          secret.error(e)
        }
        return
      }
      if (e?.name == "AggregateError") {
        setDone(cloudscraperAliveFromKey, CLOUDSCRAPER_ALIVE_TIME, false);
        setDone(cloudscraperAliveKey, 10_000, false);
      }
      throw e;
    }
  }
  const get = async (url, { headers, withInterceptorIdHeader }) => await doRequest("get", url, null, headers, withInterceptorIdHeader)
  const post = async (url, body, { headers, withInterceptorIdHeader }) => await doRequest("post", url, body, headers, withInterceptorIdHeader)
  const put = async (url, body, { headers, withInterceptorIdHeader }) => await doRequest("put", url, body, headers, withInterceptorIdHeader)
  const deleteFn = async (url, { headers, withInterceptorIdHeader }) => await doRequest("delete", url, null, headers, withInterceptorIdHeader)
  return {
    get,
    post,
    put,
    delete: deleteFn,
  }
};