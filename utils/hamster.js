import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getItemObj, setItem } from "../config/network.js";

export const newHamsterClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://api.hamsterkombatgame.io",
    headers: {
      origin: "https://hamsterkombatgame.io",
      priority: "u=1, i",
      referer: "https://hamsterkombatgame.io/",
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};
export const defaultHamsterClient = newHamsterClientWithProxy();

export const login = async (secret, initParams) => {
  const body = {
    initDataRaw: initParams,
    fingerprint: {
      version: "4.2.1",
      visitorId: "4a65dcdeddfa71c0f57413c4fb4c1226",
      components: {
        fonts: {
          value: ["Arial Unicode MS", "Gill Sans", "Helvetica Neue", "Menlo"],
          duration: 102,
        },
        domBlockers: {
          duration: 17,
        },
        fontPreferences: {
          value: {
            default: 147.5625,
            apple: 147.5625,
            serif: 147.5625,
            sans: 144.015625,
            mono: 133.0625,
            min: 9.234375,
            system: 146.09375,
          },
          duration: 35,
        },
        audio: {
          value: 0.00006426215,
          duration: 167,
        },
        screenFrame: {
          value: [30, -2050, 0, 2050],
          duration: 0,
        },
        canvas: null,
        osCpu: {
          duration: 0,
        },
        languages: {
          value: [["en-US"]],
          duration: 1,
        },
        colorDepth: {
          value: 24,
          duration: 0,
        },
        deviceMemory: {
          value: 8,
          duration: 0,
        },
        screenResolution: {
          value: [900, 1600],
          duration: 0,
        },
        hardwareConcurrency: {
          value: 6,
          duration: 0,
        },
        timezone: {
          value: "Asia/Saigon",
          duration: 4,
        },
        sessionStorage: {
          value: true,
          duration: 0,
        },
        localStorage: {
          value: true,
          duration: 0,
        },
        indexedDB: {
          value: true,
          duration: 1,
        },
        openDatabase: {
          value: false,
          duration: 0,
        },
        cpuClass: {
          duration: 0,
        },
        platform: {
          value: "MacIntel",
          duration: 0,
        },
        plugins: {
          value: [
            {
              name: "PDF Viewer",
              description: "Portable Document Format",
              mimeTypes: [
                {
                  type: "application/pdf",
                  suffixes: "pdf",
                },
                {
                  type: "text/pdf",
                  suffixes: "pdf",
                },
              ],
            },
            {
              name: "Chrome PDF Viewer",
              description: "Portable Document Format",
              mimeTypes: [
                {
                  type: "application/pdf",
                  suffixes: "pdf",
                },
                {
                  type: "text/pdf",
                  suffixes: "pdf",
                },
              ],
            },
            {
              name: "Chromium PDF Viewer",
              description: "Portable Document Format",
              mimeTypes: [
                {
                  type: "application/pdf",
                  suffixes: "pdf",
                },
                {
                  type: "text/pdf",
                  suffixes: "pdf",
                },
              ],
            },
            {
              name: "Microsoft Edge PDF Viewer",
              description: "Portable Document Format",
              mimeTypes: [
                {
                  type: "application/pdf",
                  suffixes: "pdf",
                },
                {
                  type: "text/pdf",
                  suffixes: "pdf",
                },
              ],
            },
            {
              name: "WebKit built-in PDF",
              description: "Portable Document Format",
              mimeTypes: [
                {
                  type: "application/pdf",
                  suffixes: "pdf",
                },
                {
                  type: "text/pdf",
                  suffixes: "pdf",
                },
              ],
            },
          ],
          duration: 0,
        },
        touchSupport: {
          value: {
            maxTouchPoints: 0,
            touchEvent: false,
            touchStart: false,
          },
          duration: 0,
        },
        vendor: {
          value: "Google Inc.",
          duration: 0,
        },
        vendorFlavors: {
          value: ["chrome"],
          duration: 1,
        },
        cookiesEnabled: {
          value: false,
          duration: 0,
        },
        colorGamut: {
          value: "srgb",
          duration: 0,
        },
        invertedColors: {
          duration: 1,
        },
        forcedColors: {
          value: false,
          duration: 0,
        },
        monochrome: {
          value: 0,
          duration: 1,
        },
        contrast: {
          value: 0,
          duration: 0,
        },
        reducedMotion: {
          value: false,
          duration: 1,
        },
        reducedTransparency: {
          value: false,
          duration: 0,
        },
        hdr: {
          value: false,
          duration: 0,
        },
        math: {
          value: {
            acos: 1.4473588658278522,
            acosh: 709.889355822726,
            acoshPf: 355.291251501643,
            asin: 0.12343746096704435,
            asinh: 0.881373587019543,
            asinhPf: 0.8813735870195429,
            atanh: 0.5493061443340548,
            atanhPf: 0.5493061443340548,
            atan: 0.4636476090008061,
            sin: 0.8178819121159085,
            sinh: 1.1752011936438014,
            sinhPf: 2.534342107873324,
            cos: -0.8390715290095377,
            cosh: 1.5430806348152437,
            coshPf: 1.5430806348152437,
            tan: -1.4214488238747245,
            tanh: 0.7615941559557649,
            tanhPf: 0.7615941559557649,
            exp: 2.718281828459045,
            expm1: 1.718281828459045,
            expm1Pf: 1.718281828459045,
            log1p: 2.3978952727983707,
            log1pPf: 2.3978952727983707,
            powPI: 1.9275814160560204e-50,
          },
          duration: 1,
        },
        pdfViewerEnabled: {
          value: true,
          duration: 0,
        },
        architecture: {
          value: 255,
          duration: 0,
        },
        applePay: {
          value: -1,
          duration: 0,
        },
        privateClickMeasurement: {
          duration: 0,
        },
        webGlBasics: {
          value: {
            version: "WebGL 1.0 (OpenGL ES 2.0 Chromium)",
            vendor: "WebKit",
            vendorUnmasked: "Google Inc. (Intel)",
            renderer: "WebKit WebGL",
            rendererUnmasked:
              "ANGLE (Intel, ANGLE Metal Renderer: Intel(R) UHD Graphics 630, Unspecified Version)",
            shadingLanguageVersion:
              "WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)",
          },
          duration: 21,
        },
        webGlExtensions: null,
      },
    },
  };
  const response = await secret.client.post(
    "/auth/auth-by-telegram-webapp",
    body
  );
  const authToken = response.data.authToken;
  if (!authToken)
    throw new Error(
      `request fail with status ${response?.data?.status || response?.status}`
    );
  return authToken;
};

/**
 * @deprecated
 */
export const clickWithAPI = async (secret) => {
  try {
    const payload = {
      count: 1,
      availableTaps: 1500,
      timestamp: Date.now(),
    };

    const response = await secret.client.post("/clicker/tap", payload, {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    });

    if (response.status === 200) {
      const data = response.data;
      const clickerUser = data.clickerUser;
      const requiredFields = {
        Balance: clickerUser.balanceDiamonds,
        Level: clickerUser.level,
        availableTaps: clickerUser.availableTaps,
        maxTaps: clickerUser.maxTaps,
      };
      console.log("Đang tap:", requiredFields);
      return requiredFields;
    } else {
      console.error("Không bấm được. Status code:", response.status);
    }
  } catch (error) {
    console.error("Error:", error);
  }
  return null;
};

export const checkTasks = async (secret, onlyTasks = []) => {
  const response = await secret.client.post(
    "/interlude/list-tasks",
    {},
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  if (response.status === 200) {
    const tasks = response.data.tasks;
    for (const task of tasks) {
      if (
        onlyTasks.length > 0 &&
        !onlyTasks.includes(task.id) &&
        onlyTasks.every((taskId) => !task.id.startsWith(taskId))
      )
        continue;
      if (!task.isCompleted) {
        const res = await secret.client.post(
          "/interlude/check-task",
          { taskId: task.id },
          {
            headers: {
              Authorization: `Bearer ${secret.privateKey}`,
            },
          }
        );
        secret.log(`Check task ${task.id} ${res.data?.task?.isCompleted ? "Done" : "Not Done"}`);
      }
    }
  } else {
    secret.error(
      "Không lấy được danh sách nhiệm vụ. Status code:",
      response.status
    );
  }
};

export const getBoostToBuy = async (secret) => {
  const response = await secret.client.post("/interlude/boosts-for-buy", null, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });

  return response.data?.boostsForBuy || [];
};

export const getUpgradeToBuy = async (secret) => {
  const response = await secret.client.post(
    "/interlude/upgrades-for-buy",
    null,
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data;
};

export const getClickerConfig = async (secret) => {
  const response = await secret.client.post("/interlude/config", null, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });
  return response.data;
};

const configKey = "hamster_config";
export const getLatestConfig = async (secret) => {
  const config = getItemObj(configKey);
  if (config) return config;
  const version = await getConfigVersion(secret);
  const response = await secret.client.get(`/interlude/config/${version}`, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });
  setItem(configKey, response.data, 60 * 60_000);
  return response.data;
};

export const getSkins = async (secret) => {
  const { config } = await getLatestConfig(secret);
  return config.skins;
};

export const getSkin = async (secret, skinId) => {
  const skins = await getSkins(secret);
  return skins.find(({ id }) => id == skinId);
};

export const buySkin = async (secret, skinId) => {
  const timestamp = parseInt((new Date().getTime() / 1000).toFixed(0));
  const response = await secret.client.post(
    "/interlude/buy-skin",
    {
      skinId,
      timestamp,
    },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data;
};

export const selectSkin = async (secret, skinId) => {
  const response = await secret.client.post(
    "/interlude/select-skin",
    {
      skinId,
    },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data;
};

/**
 *
 * @deprecated
 */
export const getDailyCipher = async (secret) => {
  const { dailyCipher } = await getClickerConfig(secret);
  return dailyCipher;
};

export const decodeCipher = (cipher) => {
  const answer = `${cipher.slice(0, 3)}${cipher.slice(4)}`;
  return atob(answer);
};

export const getAvailableUpgrades = async (secret) => {
  const { clickerConfig } = await getClickerConfig(secret);
  const upgradeList = clickerConfig.upgrades;
  return upgradeList;
};

export const getAirdropTasks = async (secret) => {
  const response = await secret.client.post(
    "/interlude/list-airdrop-tasks",
    null,
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data.airdropTasks;
};

export const getHamsterSync = async (secret) => {
  const response = await secret.client.post("/interlude/sync", null, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });

  return response.data?.interludeUser;
};

export const getAccountInfo = async (secret) => {
  const response = await secret.client.post("/auth/account-info", null, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });

  return response.data?.accountInfo;
};

export const getTgUserId = async (secret) => {
  const { id } = await getAccountInfo(secret);
  return id;
};

export const parseTgUserId = (secret) => {
  const key = secret.privateKey
  return key.slice(-10);
}

export const addRefferal = async (secret, authUserId) => {
  const response = await secret.client.post(
    "/interlude/add-referral",
    { authUserId: `${authUserId}` },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );
  return response.data;
};

export const getConfigVersion = async (secret) => {
  const response = await secret.client.post("/auth/account-info", null, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });

  return response.headers["interlude-config-version"];
};

/**
 * 
 * @deprecated
 */
export const getDailyCombo = async (secret) => {
  const response = await secret.client.post(
    "/interlude/upgrades-for-buy",
    null,
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data?.dailyCombo;
};

export const claimDailyCombo = async (secret) => {
  const { upgradeIds: dailyCombo, isClaimed } = await getDailyCombo(secret);
  if (isClaimed) return;
  if (dailyCombo.length < 3) {
    console.log(
      `${secret.id} not enough daily combo, available: ${dailyCombo}`
    );
    return false;
  }
  const response = await secret.client.post(
    "/interlude/claim-daily-combo",
    null,
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return true;
};

/**
 * @deprecated
 */
export const claimDailyCipher = async (secret, dailyCipher) => {
  const response = await secret.client.post(
    "/clicker/claim-daily-cipher",
    {
      cipher: dailyCipher,
    },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data;
};

export const selectExchange = async (secret, exchangeId = "binance") => {
  const response = await secret.client.post(
    "/interlude/select-exchange",
    {
      exchangeId,
    },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data?.interludeUser;
};

export const deleteHamsterLinkedWallet = async (secret) => {
  const response = await secret.client.post("/interlude/delete-wallet", null, {
    headers: {
      Authorization: `Bearer ${secret.privateKey}`,
    },
  });

  return response.data?.interludeUser;
};

export const linkHamsterWallet = async (secret, address) => {
  const response = await secret.client.post(
    "/interlude/check-airdrop-task",
    {
      id: "airdrop_connect_ton_wallet",
      walletAddress: address,
    },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data?.airdropTask;
};

export const cipherDecode = (e) => {
  const t = `${e.slice(0, 3)}${e.slice(4)}`;
  return atob(t);
};

export const getbalanceDiamonds = async (secret) => {
  const response = await secret.client.post(
    "/interlude/sync",
    {},
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );
  return response.data.interludeUser.balanceDiamonds;
};

export const buyUpgrades = async (
  secret,
  ceilPrice = 10000,
) => {
  const upgradesResponse = await secret.client.post(
    "/interlude/upgrades-for-buy",
    {},
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );


  const upgrades = upgradesResponse.data.upgradesForBuy;
  let balanceDiamonds = await getbalanceDiamonds(secret);
  upgrades.sort((a, b) => a.price - b.price)
  for (const upgrade of upgrades) {
    if (upgrade.cooldownSeconds > 0) {
      continue;
    }
    if (
      upgrade.isAvailable &&
      !upgrade.isExpired &&
      upgrade.price < ceilPrice &&
      upgrade.price <= balanceDiamonds &&
      (!upgrade.maxLevel ||
        (upgrade.maxLevel && upgrade.level <= upgrade.maxLevel))
    ) {
      const buyUpgradePayload = {
        upgradeId: upgrade.id,
        timestamp: Date.now(),
      };
      try {
        const response = await secret.client.post(
          "/interlude/buy-upgrade",
          buyUpgradePayload,
          {
            headers: {
              Authorization: `Bearer ${secret.privateKey}`,
            },
          }
        );
        if (response.status === 200) {
          secret.log(
            `(Số dư = ${Math.floor(balanceDiamonds)}) Đã nâng cấp thẻ ${upgrade.name
            } level ${upgrade.level} (giá ${upgrade.price})`
          );
          balanceDiamonds -= upgrade.price;
        }
      } catch (error) {
        if (error?.response?.data?.error_code === "UPGRADE_COOLDOWN") {
          continue;
        } else {
          throw error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
};

export const buyBoostTap = async (secret, ceilPrice = 10000) => {
  try {
    const boostsResponse = await secret.client.post(
      "/interlude/boosts-for-buy",
      {},
      {
        headers: {
          Authorization: `Bearer ${secret.privateKey}`,
        },
      }
    );

    if (boostsResponse.status === 200 && boostsResponse.data.boostsForBuy) {
      const boosts = boostsResponse.data.boostsForBuy.filter((boost) =>
        ["BoostMaxTaps", "BoostEarnPerTap"].includes(boost.id)
      );
      for (const boost of boosts) {
        let balanceDiamonds = await getbalanceDiamonds(secret);
        if (
          boost &&
          boost.cooldownSeconds === 0 &&
          boost.price < ceilPrice &&
          boost.price <= balanceDiamonds
        ) {
          const buyBoostPayload = {
            boostId: boost.id,
            timestamp: Math.floor(Date.now() / 1000),
          };
          console.log(
            `${secret.id} (Số dư = ${balanceDiamonds}) Đang mua ${boost.id} level ${boost.level} (giá ${boost.price})`
          );
          await secret.client.post("/interlude/buy-boost", buyBoostPayload, {
            headers: {
              Authorization: `Bearer ${secret.privateKey}`,
            },
          });
        }
      }
    } else {
      console.log(
        `${secret.id} Không lấy được danh sách boosts. Status code: ${boostsResponse.status}`
      );
    }
  } catch (error) {
    console.error(`${secret.id} Lỗi: ${error?.response?.data?.error_message || error?.message}`);
    return false;
  }
  return true;
};

export const getMiniGameConfig = async (secret) => {
  const { dailyKeysMiniGames } = await getClickerConfig(secret);
  return dailyKeysMiniGames;
};

export const startKeyMiniGame = async (secret, miniGameId) => {
  const response = await secret.client.post(
    "/interlude/start-keys-minigame",
    {
      miniGameId,
    },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data?.dailyKeysMiniGames;
};

// MDM3NjM4OTc4MnwxMjU2Mjc5NTM1
export const claimKeyMiniGame = async (secret, miniGameId, cipher) => {
  const response = await secret.client.post(
    "/interlude/claim-daily-keys-minigame",
    {
      miniGameId,
      cipher,
    },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data.dailyKeysMiniGame;
};

// {
//   "id": "Binance",
//   "depositAddress": "EQD5mxRgCuRNLxKxeOjG6r14iSroLF5FtomPnet-sgP5xNJb",
//   "memo": "106640801"
// }
export const setExchangeAsDefault = async (
  secret,
  id,
  depositAddress,
  memo
) => {
  const response = await secret.client.post(
    "/interlude/withdraw/set-exchange-as-default",
    {
      id,
      depositAddress,
      memo,
    },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data.interludeUser;
};

// {
//   "id": "TonWallet",
//   "walletAddress": "UQDRxoowkVtP69Gr5L9ren_chMKYtUmrpooEoUc37HEUfUBs"
// }
export const setWalletAsDefault = async (secret, walletAddress) => {
  const response = await secret.client.post(
    "/interlude/withdraw/set-wallet-as-default",
    {
      id: "TonWallet",
      walletAddress,
    },
    {
      headers: {
        Authorization: `Bearer ${secret.privateKey}`,
      },
    }
  );

  return response.data.interludeUser;
};
