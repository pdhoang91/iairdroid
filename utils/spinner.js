import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export const newSpinnerClientWithProxy = (proxy, log = console.log) => {
  const param = {
    baseURL: "https://back.timboo.pro",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://spinner.timboo.pro",
      Referer: "https://spinner.timboo.pro/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
  }
  return axios.create(param);
};
export const defaultSpinnerClient = newSpinnerClientWithProxy();

export const register = async (secret) => {
  const response = await secret.client.post("https://api.timboo.pro/register", {
    initData: secret.privateKey,
  });
  if (response?.data?.message == "User already registered") {
    return false;
  }
  secret.log("Register user success");
  return response.data;
};

export const getSpinnerBoxes = async (secret) => {
  const response = await secret.client.post("https://api.timboo.pro/get_data", {
    initData: secret.privateKey,
  });
  return response.data.boxes || [];
};

export const getSpinnerInitData = async (secret) => {
  const response = await secret.client.post("/api/init-data", {
    initData: secret.privateKey,
  });
  return response.data.initData;
};

export const tapSpinner = async (secret, count = 10, isClose = null) => {
  const response = await secret.client.post("/api/upd-data", {
    initData: secret.privateKey,
    data: {
      timestamp: count * 86559566,
      isClose,
    },
  });
  return response.data.updateData;
};

export const repairSpinner = async (secret) => {
  const response = await secret.client.post("/api/repair-spinner", {
    initData: secret.privateKey,
  });
  return response.data;
};

export const useSpinnerFullHp = async (secret, spinnerId) => {
  const response = await secret.client.post("/api/fullhp-activate", {
    spinnerId,
    initData: secret.privateKey,
  });
  return response.data;
};

export const upgradeSpinner = async (secret, spinnerId) => {
  const response = await secret.client.post("/api/upgrade-spinner", {
    spinnerId,
    initData: secret.privateKey,
  });
  return response.data;
};

export const openSpinnerBox = async (secret, boxId) => {
  const response = await secret.client.post("https://api.timboo.pro/open_box", {
    boxId,
    initData: secret.privateKey,
  });
  return response.data;
};

export const activateRocket = async (secret, spinnerId) => {
  const response = await secret.client.post("/api/rocket-activate", {
    spinnerId,
    initData: secret.privateKey,
  });
  return response.data;
};

export const checkRequirement = async (secret, requirementId) => {
  const response = await secret.client.post(
    "https://api.timboo.pro/check_requirement",
    {
      requirementId,
      initData: secret.privateKey,
    }
  );
  return response.data;
};

export const selectSpinner = async (secret, spinnerId) => {
  const response = await secret.client.post("/api/select-spinner", {
    spinnerId,
    initData: secret.privateKey,
  });
  return response.data;
};

// request body: {"initData":"","address":"0:c5f3b6e9800d36b396bddb26a8839af4c79fb378f18cbb4d223150c2c582dbcd"}
// response: {
//   "message": "ok",
//   "results": [
//     {
//       "message": "success",
//       "status": "success"
//     }
//   ],
//   "spinners": [
//     {
//       "address": null,
//       "endRepairTime": "Fri, 15 Nov 2024 07:15:06 GMT",
//       "hp": 0,
//       "id": 4411422,
//       "imgLink": "https://files.timboo.pro/spinner_img/1732227795",
//       "index": null,
//       "isBroken": 1,
//       "isConfirmed": null,
//       "isMinted": 0,
//       "isSale": 0,
//       "isSwipe": 0,
//       "level": 20,
//       "newClicks": 0,
//       "rarity": {
//         "fullhpX": 1,
//         "name": "common",
//         "repairtimeX": 1,
//         "turbospinX": 1
//       },
//       "rocket": {
//         "endTime": "Thu, 08 Aug 2024 16:26:28 GMT"
//       },
//       "spinnerStats": {
//         "fullHp": 50,
//         "repairTime": 50,
//         "speed": 50,
//         "turbospin": 17
//       }
//     }
//   ]
// }
export const linkWallet = async (secret, address) => {
  const response = await secret.client.post(
    "https://api.timboo.pro/set_wallet",
    {
      address,
      initData: secret.privateKey,
    }
  );
  return response.data;
};

export const deleteWallet = async(secret) => {
  return await linkWallet(secret, null);
}

const TAP_PER_TIME = 5,
  INIT_FINAL_NEXT_TIME = 1_000_000_000_000_000;

export const autoClick = async (
  secret,
  oneTime = false,
  exec = async (fn) => await fn(),
  useRocket = true,
  allSpinner = false
) => {
  while (true) {
    let finalNextTime = INIT_FINAL_NEXT_TIME,
      doneCheck = false;
    try {
      await exec(() => register(secret));
      let { spinners, user } = await exec(
        async () => await getSpinnerInitData(secret)
      );
      if (user.isBanned == 1) {
        secret.log("User đã bị ban, ko tap được");
        return
      }
      let { mainSpinnerId, fullhpAmount, rocketsAmount } = user;
      if (spinners.length == 0) {
        oneTime = true;
        doneCheck = true;
        return;
      }
      for (const spinner of spinners) {
        let {
          id: spinnerId,
          hp,
          spinnerStats,
          endRepairTime,
          isBroken,
        } = spinner;
        if (!allSpinner && spinnerId != mainSpinnerId) {
          continue;
        }
        let earnPerTap = spinnerStats.turbospin;
        let nextTime = INIT_FINAL_NEXT_TIME,
          isRepairSpinner = true;
        if (isBroken) {
          if (endRepairTime) {
            nextTime = new Date(endRepairTime) - new Date();
            isRepairSpinner = false;
          }
        }
        if (
          !isBroken ||
          (isBroken && nextTime < 0 && spinnerId != mainSpinnerId)
        ) {
          if (spinnerId != mainSpinnerId) {
            secret.log(`Chọn spinner ${spinnerId} làm spinner chính`);
            await exec(() => selectSpinner(secret, spinnerId));
            let { spinners } = await exec(
              async () => await getSpinnerInitData(secret)
            );
            let newSpinerData = spinners.find(({ id }) => id == spinnerId);
            // console.log(newSpinerData)
            if (!newSpinerData) {
              continue;
            }
            hp = newSpinerData.hp;

            mainSpinnerId = spinnerId;
          }
          let tap = (hp / earnPerTap).toFixed(0);
          let tapTime = TAP_PER_TIME;
          while (tap > 0) {
            if (tap < TAP_PER_TIME) {
              tapTime = tap;
            }
            if (tapTime <= 0) {
              break;
            }
            secret.log(
              `Đang tap spinner ${spinnerId} ${tapTime} lần, còn ${
                tap - tapTime
              } lần`
            );
            const res = await exec(() => tapSpinner(secret, tapTime));
            if (res) {
              hp -= tapTime * earnPerTap;
              tap = (hp / earnPerTap).toFixed(0);
            }
          }
          isRepairSpinner = true;
        }
        if (spinnerId == mainSpinnerId) {
          // open box
          const boxes = await exec(() => getSpinnerBoxes(secret));
          for (const box of boxes) {
            const { open_time } = box;
            var sod = new Date();
            sod.setUTCHours(0, 0, 0, 0);
            if (!open_time || (open_time && new Date(open_time) < sod)) {
              secret.log(`Mở box #${box.id} ${box.name}`);
              const result = await exec(() => openSpinnerBox(secret, box.id));
              if (result.fullHp) {
                secret.log(`Box ${box.id} được ${result.fullHp} lần hồi mana`);
                fullhpAmount++;
              } else if (result.tokens) {
                secret.log(`Box ${box.id} ăn ${result.tokens} token`);
              } else if (result.xBonus) {
                secret.log(
                  `Box ${box.id} ăn bonus ${JSON.stringify(result.xBonus)}`
                );
              }
            }
          }
          // use rocket
          while (useRocket && rocketsAmount > 0) {
            await exec(
              async () =>
                await new Promise(async (resolve) => {
                  secret.log(
                    `Đang kích hoạt Rocket cho spinner ${spinnerId}, còn lại ${
                      rocketsAmount - 1
                    } rocket`
                  );
                  await activateRocket(secret, spinnerId);
                  let rocketFinished = false;
                  setTimeout(() => {
                    rocketFinished = true;
                  }, 10000);
                  while (true) {
                    if (rocketFinished) break;
                    try {
                      secret.log(
                        `(Rocket) Đang tap spinner ${spinnerId} ${TAP_PER_TIME} lần`
                      );
                      await tapSpinner(secret, TAP_PER_TIME);
                    } catch (e) {
                      secret.error(e);
                    }
                  }
                  secret.log(`(Rocket) Đã hết thời gian`);
                  resolve();
                })
            );
            rocketsAmount--;
          }
          if (fullhpAmount > 0) {
            secret.log(`Đang dùng full hp`);
            await exec(() => useSpinnerFullHp(secret, spinnerId));
            nextTime = 0;
            isRepairSpinner = false;
          }
        }

        if (isRepairSpinner) {
          if (spinnerId != mainSpinnerId) {
            secret.log(`Chọn spinner ${spinnerId} làm spinner chính`);
            await exec(() => selectSpinner(secret, spinnerId));
          }
          secret.log(`Đang sửa spinner`);
          await exec(() => repairSpinner(secret));
          nextTime = 0;
        }
        doneCheck = true;
        if (nextTime < finalNextTime) {
          finalNextTime = nextTime;
        }
      }
    } catch (e) {
      secret.error(e);
      finalNextTime = 60_000;
    } finally {
      if (oneTime && doneCheck) {
        return;
      }
      if (finalNextTime == INIT_FINAL_NEXT_TIME) {
        finalNextTime = 10000;
      }
      if (finalNextTime < 0) {
        finalNextTime = 1000;
      }
      if (finalNextTime > 0) {
        secret.log(`Tap sau ${(finalNextTime / 60_000).toFixed(2)} phút`);
      }
      await new Promise((resolve) => setTimeout(resolve, finalNextTime));
    }
  }
};
