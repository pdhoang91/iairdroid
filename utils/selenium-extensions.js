//src/utils/selenium-extensions.js
import request from "request";
import {
  SELENIUM_EXTENSION_PATH,
} from "../config/network.js";
import fs, { mkdirSync } from "fs";
import crypto from "crypto";
import { newSemaphore } from "./semaphore.js";
import { getExtensionFileName } from "./selenium.js";

export const GRADIENT_EXTENSION_ID = "caacbgbklghmpodbdafajbgdnegacfmo";

const CRX_URL = (extensionId) =>
  `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=98.0.4758.102&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc&nacl_arch=x86-64`;
const { exec } = newSemaphore();
const extensionMap = {};
export const getRegisteredExtensions = (id) => {
  if (!(id in extensionMap)) {
    extensionMap[id] = [];
  }
  return extensionMap[id];
}

export const registerExtension = (secret, id, type) => {
  if (!(id in extensionMap)) {
    extensionMap[id] = [];
  }
  switch (type) {
    case "gradient":
      extensionMap[id].push(GRADIENT_EXTENSION_ID);
      break
    default:
      console.log(`Extension ${type} is not supported`);
      return
  }
  secret.log(`Register extension ${type} for chrome instance ${id}`);
}

export const downloadExtension = (secret, extensionId, userAgent) =>
  exec(async () => {
    const url = CRX_URL(extensionId);
    const headers = { "User-Agent": userAgent };
    const extensionLocation = getExtensionFileName(extensionId);
    if (fs.existsSync(extensionLocation)) {
      return;
    }
    secret.log(`Downloading extension into path: ${extensionLocation}`);
    mkdirSync(SELENIUM_EXTENSION_PATH, { recursive: true });

    return new Promise((resolve, reject) => {
      request({ url, headers, encoding: null }, (error, response, body) => {
        if (error) {
          secret.error("Error downloading extension:", error);
          return reject(error);
        }
        fs.writeFileSync(extensionLocation, body);
        const md5 = crypto.createHash("md5").update(body).digest("hex");
        secret.log("Extension MD5: " + md5);
        resolve();
      });
    });
  });