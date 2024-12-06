import { ipcMain, dialog, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import url, { fileURLToPath } from "url";
import { setup as setupCron } from "./cron.bg.js";
import {
  addToSecretVault,
  getPrivateKeyByAddress,
} from "../../config/secret-manager.js";
import electron from "electron";
import { claimReward } from "../../utils/balance-ocean.js";
import {
  collectComissionForFile,
  setup as commissionSetup,
} from "./comission.bg.js";
import {
  setup as spellSetup,
} from "../spell/spell.bg.js";
import {
  setup as spinnerSetup,
} from "../spinner/spinner.bg.js";

import {
  setup as pixelVerseSetup,
} from "../pixelVerse/pixcel.bg.js";

import {
  setup as timefamSetup,
} from "../timefarm/timefarm.bg.js";
import {
  setup as filterFraudProxySetup,
} from "./filter-fraud-proxy.js";
import {
  setup as exportYescoinAuthSetup,
} from "./export-yescoin-auth.js";
import {
  setup as yescoinSetup,
} from "../yescoin/yescoin.bg.js";
import {
  setup as hamsterSetup,
} from "../hamster/hamster.bg.js";

import {
  setup as djdogSetup,
} from "../djdog/djdog.bg.js";

import {
  setup as bananaSetup,
} from "../banana/banana.bg.js";
import {
  setup as tomarketSetup,
} from "../tomarket/tomarket.bg.js";
import {
  setup as lostDogSetup,
} from "../lost-dog/lost-dog.bg.js";
import {
  setup as duckChainSetup,
} from "../duckchain/duckchain.bg.js";
import {
  setup as memelandTgSetup,
} from "../memelandtg/memelandtg.bg.js";
import {
  setup as blumSetup,
} from "../blum/blum.bg.js";
import {
  setup as majorSetup,
} from "../major/major.bg.js";
import {
  setup as oceanSetup,
} from "../ocean/ocean.bg.js";
import {
  setup as oceanOffchainSetup,
} from "../ocean/ocean-offchain.bg.js";
import {
  setup as birdSetup,
} from "../birds/birds.bg.js";
import {
  setup as gradientSetup,
} from "../gradient-network/gradient.bg.js";
import { newSemaphore } from "../../utils/semaphore.js";

let cronBrowsers = [];
const { exec } = newSemaphore(10);

export const setup = (window) => {
  const log = (str) => {
    window.webContents.send("main-console", str);
    console.log(str);
  };
  commissionSetup(log);
  filterFraudProxySetup(window, log);
  exportYescoinAuthSetup(window, log);
  ipcMain.on("load-config", async (event) => {
    const { filePaths } = await dialog.showOpenDialog(window, {
      properties: ["openDirectory"],
      message: "Chọn thư mục chứa private key",
    });
    if (filePaths.length == 0) return;
    log(`Tải ${filePaths.length} file config...`);
    log(`Folder chứa data ứng dụng: ${electron.app.getPath("userData")}`)
    const files = fs.readdirSync(filePaths[0]);
    const bootFileList = [];
    await Promise.all(
      files.map(async (file) => {
        if (!file.endsWith(".csv")) return;
        let type = "sui";
        if (file.endsWith("hamster.private.csv")) {
          type = "hamster";
        } else if (file.endsWith("fish.private.csv")) {
          type = "fish";
        } else if (file.endsWith("spell.private.csv")) {
          type = "spell";
        } else if (file.endsWith("spinner.private.csv")) {
          type = "spinner";
        } else if (file.endsWith("pixelVerse.private.csv")) {
          type = "pixelVerse";
        }
        else if (file.endsWith("timefarm.private.csv")) {
          type = "timefarm";
        }
        else if (file.endsWith("yescoin.private.csv")) {
          type = "yescoin";
        }
        else if (file.endsWith("djdog.private.csv")) {
          type = "djdog";
        } else if (file.endsWith("banana.private.csv")) {
          type = "banana";
        } else if (file.endsWith("tomarket.private.csv")) {
          type = "tomarket";
        } else if (file.endsWith("lostdog.private.csv")) {
          type = "lostdog";
        } else if (file.endsWith("duckchain.private.csv")) {
          type = "duckchain";
        } else if (file.endsWith("memelandtg.private.csv")) {
          type = "memelandtg";
        } else if (file.endsWith("blum.private.csv")) {
          type = "blum";
        } else if (file.endsWith("major.private.csv")) {
          type = "major";
        } else if (file.endsWith("ocean-offchain.private.csv")) {
          type = "sui";
        } else if (file.endsWith("birds.private.csv")) {
          type = "birds";
        } else if (file.endsWith("gradient.private.csv")) {
          type = "gradient";
        }
        try {
          const fileName = path.join(filePaths[0], file);
          log(`Tải secret key từ file ${fileName}`);
          const data = fs.readFileSync(fileName);
          if (!data) {
            log(`Không tìm thấy data từ file ${fileName}`);
            return;
          }
          await addToSecretVault(file, data.toString("utf8"), type);
          bootFileList.push(file);
        } catch (e) {
          log(e);
          throw e;
        }
      })
    );
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    cronBrowsers = bootFileList.map((fileName) => {
      console.log(fileName);
      const newWindow = new BrowserWindow({
        title: fileName,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          // preload: path.join(__dirname, "./cron.preload.js"),
        },
        show: false,
      });
      let pathName = "../ocean/ocean.html",
        runningCommisionJob = false,
        setupFunction = [oceanSetup];
      if (fileName.endsWith("hamster.private.csv")) {
        pathName = "../hamster/hamster.html";
        setupFunction = [hamsterSetup]
      } else if (fileName.endsWith("fish.private.csv")) {
        pathName = "../fish/fish.html";
      } else if (fileName.endsWith("spell.private.csv")) {
        pathName = "../spell/spell.html";
        setupFunction = [spellSetup]
      } else if (fileName.endsWith("spinner.private.csv")) {
        pathName = "../spinner/spinner.html";
        setupFunction = [spinnerSetup]
      } else if (fileName.endsWith("pixelVerse.private.csv")) {
        pathName = "../pixelVerse/pixel.html";
        setupFunction = [pixelVerseSetup]
      }
      else if (fileName.endsWith("timefarm.private.csv")) {
        pathName = "../timefarm/timefarm.html";
        setupFunction = [timefamSetup]
      }
      else if (fileName.endsWith("yescoin.private.csv")) {
        pathName = "../yescoin/yescoin.html";
        setupFunction = [yescoinSetup]
      }
      else if (fileName.endsWith("djdog.private.csv")) {
        pathName = "../djdog/djdog.html";
        setupFunction = [djdogSetup]
      }
      else if (fileName.endsWith("banana.private.csv")) {
        pathName = "../banana/banana.html";
        setupFunction = [bananaSetup]
      }
      else if (fileName.endsWith("tomarket.private.csv")) {
        pathName = "../tomarket/tomarket.html";
        setupFunction = [tomarketSetup]
      }
      else if (fileName.endsWith("lostdog.private.csv")) {
        pathName = "../lost-dog/lost-dog.html";
        setupFunction = [lostDogSetup]
      }
      else if (fileName.endsWith("duckchain.private.csv")) {
        pathName = "../duckchain/duckchain.html";
        setupFunction = [duckChainSetup]
      }
      else if (fileName.endsWith("memelandtg.private.csv")) {
        pathName = "../memelandtg/memelandtg.html";
        setupFunction = [memelandTgSetup]
      }
      else if (fileName.endsWith("blum.private.csv")) {
        pathName = "../blum/blum.html";
        setupFunction = [blumSetup]
      }
      else if (fileName.endsWith("major.private.csv")) {
        pathName = "../major/major.html";
        setupFunction = [majorSetup]
      }
      else if (fileName.endsWith("ocean-offchain.private.csv")) {
        pathName = "../ocean/ocean-offchain.html";
        setupFunction = [oceanOffchainSetup];
      }
      else if (fileName.endsWith("birds.private.csv")) {
        pathName = "../birds/birds.html";
        setupFunction = [birdSetup];
      }
      else if (fileName.endsWith("gradient.private.csv")) {
        pathName = "../gradient-network/gradient.html";
        setupFunction = [gradientSetup];
      }

      newWindow.loadURL(
        url.format({
          pathname: path.join(__dirname, pathName),
          protocol: "file:",
          slashes: true,
        })
      );
      newWindow.webContents.on("did-finish-load", function () {
        newWindow.show();
        log(`Cấu hình cho cửa sổ ${fileName}`);
        setupCron(newWindow, fileName);
        setupFunction.map(fn => fn(newWindow, fileName))
        if (runningCommisionJob) {
          log(`Chạy job thu hoạch hoa hồng cho cửa sổ ${fileName}`);
          collectComissionForFile(fileName);
        }
      });

      return { fileName, win: newWindow, sender: newWindow.webContents };
    });

    event.sender.send(
      "load-config",
      cronBrowsers.map(({ fileName }) => fileName)
    );
  });
  ipcMain.on("main-console", (event, file) => {
    const browser = cronBrowsers.find(({ fileName }) => fileName == file);
    if (browser) {
      browser.show();
    }
  });
  ipcMain.on("claim-reward", async (event, address, fileName, claimHour) => {
    const { id, privateKey, keyPair } = getPrivateKeyByAddress(address);
    const log = (str) => {
      event.sender.send(`${fileName}-console`, str);
      console.log(str);
    };
    try {
      await claimRewardWithPool(
        { id, address, privateKey, keyPair, claimHour },
        log
      );
      event.sender.send(`${fileName}-claim`, address, null);
    } catch (e) {
      event.sender.send(`${fileName}-claim`, address, e.message);
    }
  });

  const claimRewardWithPool = async (sender, log) => {
    return await exec(async () => await claim(sender, log), 0.5);
  };

  const claim = async (sender, log) => {
    log(
      `${sender.id} >> Điểm danh (${sender.claimHour} giờ 1 lần)...`
    );
    const response = await claimReward(sender);
    if (!response) {
      return;
    }
    if (response.effects.status.status != "success") {
      throw new Error(`Yêu cầu bị từ chối, lỗi: ${JSON.stringify(response)}`);
    }
  };
};
