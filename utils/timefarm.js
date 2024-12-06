import querystring from "querystring";
import { cyan, yellow, blue, green, magenta } from "console-log-colors";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

const commonHeaders = {
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
  'content-type': 'application/json',
  'origin': 'https://tg-tap-miniapp.laborx.io',
  'priority': 'u=1, i',
  'referer': 'https://tg-tap-miniapp.laborx.io/',
  'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
}

export const newTimeFarmClientWithProxy = (
  proxy,
  log = console.log
) => {
  const param = {
    baseURL: "https://tg-bot-tap.laborx.io",
    headers: { ...commonHeaders},
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
    log(`Tạo TimeFarm client với proxy ${ip}:${port}`);
  } else {
    log("Tạo TimeFarm client mà không có proxy");
  }
  return axios.create(param);
};

export async function login(secret) {
  //
  const payload = {
    initData: secret.privateKey,
    platform: "android"
  };
  console.log(payload)
  const response = await secret.client.post(
    "/api/v1/auth/validate-init/v2",
    payload,
    { headers: commonHeaders }
  );
  if (response && response.status == 200) {
    secret.log(green.bold(`[*] Account ${secret.id} | Get token success`));
    return {
      access_token: response.data.token,
      data: response.data.info,
    };
  }
}

export async function getFarmInfo(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: `Bearer ${token}`,
  };

  const response = await secret.client.get("/api/v1/farming/info", {
    headers: headers,
  });

  if (response && response.status === 200) {
    return response.data;
  } else {
    throw new Error(response.status);
  }
}

export async function getFarmFinish(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: `Bearer ${token}`,
  };

  const payload = {};

  const response = await secret.client.post("/api/v1/farming/finish", payload, {
    headers: headers,
  });

  if (response && response.status == 200) {
    return response.data;
  } else {
    throw new Error(response.status);
  }
}
export async function getFarmStart(secret, token) {
  const headers = {
    ...commonHeaders,
    Authorization: `Bearer ${token}`,
  };

  const payload = {};

  const response = await secret.client.post("/api/v1/farming/start", payload, {
    headers: headers,
  });

  if (response && response.status == 200) {
    return response.data;
  } else {
    throw new Error(response.status);
  }
}
/// ----- modified to here
async function getBalanceInfo(stt, token, axios) {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const payload = {};

    const response = await axios.get(
      "https://tg-bot-tap.laborx.io/api/v1/balance",
      { headers: headers }
    );

    if (response && response.status == 200) {
      return response.data;
    }
  } catch (e) {
    console.log(`[e] Account ${stt} | getBalanceInfo err: ${e}`);
  }
}
async function getClaimRef(stt, token, axios) {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const payload = {};

    const response = await axios.post(
      "https://tg-bot-tap.laborx.io/api/v1/balance/referral/claim",
      payload,
      { headers: headers }
    );

    if (response && response.status == 200) {
      return response.data;
    }
  } catch (e) {
    console.log(`[e] Account ${stt} | getClaimRef err: ${e}`);
  }
}

async function getTaskInfo(stt, token, axios) {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const payload = {};

    const response = await axios.get(
      "https://tg-bot-tap.laborx.io/api/v1/tasks",
      { headers: headers }
    );

    if (response && response.status == 200) {
      return response.data;
    }
  } catch (e) {
    console.log(`[e] Account ${stt} | getTaskInfo err: ${e}`);
  }
}

async function submitTask(stt, token, axios, idTask) {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const payload = {};

    const response = await axios.post(
      `https://tg-bot-tap.laborx.io/api/v1/tasks/${idTask}/submissions`,
      payload,
      { headers: headers }
    );

    if (response && response.status == 200) {
      return response.data;
    }
  } catch (e) {
    console.log(`[e] Account ${stt} | submitTask err: ${e}`);
  }
}

async function claimTask(stt, token, axios, idTask) {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const payload = {};

    let response = await axios.post(
      `https://tg-bot-tap.laborx.io/api/v1/tasks/${idTask}/claims`,
      payload,
      { headers: headers }
    );

    if (response && response.status == 200) {
      if (response.data == "OK") {
        response = await axios.get(
          `https://tg-bot-tap.laborx.io/api/v1/tasks/${idTask}`,
          { headers: headers }
        );
        if (response && response.status == 200) {
          return response.data;
        }
      }
    }
  } catch (e) {
    console.log(`[e] Account ${stt} | claimTask err: ${e}`);
  }
}

async function levelUpgrade(stt, token, axios) {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const payload = {};

    let response = await axios.post(
      `https://tg-bot-tap.laborx.io/api/v1/me/level/upgrade`,
      payload,
      { headers: headers }
    );

    if (response && response.status == 200) {
      return response.data;
    }
  } catch (e) {
    console.log(`[e] Account ${stt} | claimTask err: ${e}`);
  }
}
//
async function main(stt, account, axios) {
  try {
    let urlData = querystring
      .unescape(account)
      .split("tgWebAppData=")[1]
      .split("&tgWebAppVersion")[0];

    console.log(cyan.bold(`[#] Account ${stt} | Login...`));
    await sleep(5);
    let { access_token, data } = await login(stt, urlData, axios);
    if (access_token) {
      console.log(cyan.bold(`[#] Account ${stt} | Get Farm Info...`));
      await sleep(5);
      if (auto_farm) {
        let farmInfo = await getFarmInfo(stt, access_token, axios);
        if (farmInfo) {
          if (farmInfo.activeFarmingStartedAt == null) {
            console.log(cyan.bold(`[#] Account ${stt} | Start Claim ...`));
            let firtClaim = await getFarmStart(stt, access_token, axios);
            if (firtClaim) {
              let timeDur = firtClaim.farmingDurationInSec;
              if (timeDur > 0) {
                console.log(
                  green.bold(
                    `[#] Account ${stt} | Start Farm Success | Duration before: ${convertSecondsToHMS(
                      timeDur
                    )}`
                  )
                );
              }
            }
          } else {
            const startedAt = new Date(farmInfo.activeFarmingStartedAt);
            const now = new Date();

            if ((now - startedAt) / (1000 * 60 * 60) >= 4) {
              console.log(cyan.bold(`[#] Account ${stt} | Claim Finish...`));
              await sleep(randomInt(2, 5));
              let claimFarm = await getFarmFinish(stt, access_token, axios);
              if (claimFarm) {
                let farmInfo2 = await getFarmInfo(stt, access_token, axios);
                if (farmInfo2 && farmInfo2.activeFarmingStartedAt == null) {
                  console.log(cyan.bold(`[#] Account ${stt} | Start Claim...`));
                  let firtClaim = await getFarmStart(stt, access_token, axios);
                  if (firtClaim) {
                    let timeDur = firtClaim.farmingDurationInSec;
                    if (timeDur > 0) {
                      console.log(
                        green.bold(
                          `[#] Account ${stt} | Start Farm Success | Duration before: ${convertSecondsToHMS(
                            timeDur
                          )}`
                        )
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (auto_claim_ref) {
        await sleep(2);
        let getBalance = await getBalanceInfo(stt, access_token, axios);
        if (getBalance) {
          if (getBalance.referral.availableBalance > 0) {
            console.log(
              cyan.bold(`[#] Account ${stt} | Claim Referral Friend!`)
            );
            await sleep(2);
            let claimRef = await getClaimRef(stt, access_token, axios);
            console.log(
              cyan.bold(
                `[#] Account ${stt} | Claim Referral Friend Success!, Balance (+): ${getBalance.referral.availableBalance}`
              )
            );
          }
        }
      }

      if (auto_task) {
        console.log(yellow.bold(`[#] Account ${stt} | Open Auto Task!`));
        let subDone1 = false;
        await sleep(2);

        let getTask = await getTaskInfo(stt, access_token, axios);
        if (getTask) {
          const taskIncom = getTask.filter((item) => !item.submission);
          if (taskIncom.length > 0) {
            console.log(
              cyan.bold(`[#] Account ${stt} | Start ${taskIncom.length} Task!`)
            );
            for (let i = 0; i < taskIncom.length; i++) {
              let idTask = taskIncom[i].id;
              let nameTask = taskIncom[i].title;
              let rewardTask = taskIncom[i].reward;
              console.log(
                blue.bold(
                  `[#] Account ${stt} | Start task: ${nameTask} - Reward ${rewardTask}`
                )
              );
              sleep(2);
              let checkT = await submitTask(stt, access_token, axios, idTask);
              if (checkT == "OK") {
                console.log(
                  magenta.bold(
                    `[#] Account ${stt} | Submit task: ${nameTask} - Reward ${rewardTask} - Pending..`
                  )
                );
                subDone1 = true;
              }
              sleep(5);
            }
          }
        }

        if (subDone1) {
          console.log(
            yellow.bold(`[#] Account ${stt} | Sleep 65s To completed task..`)
          );
          await sleep(65);
        }

        let getTask2 = await getTaskInfo(stt, access_token, axios);
        if (getTask2) {
          const taskCheck = getTask2.filter(
            (item) => item.submission && item.submission.status == "COMPLETED"
          );
          if (taskCheck.length > 0) {
            console.log(
              cyan.bold(`[#] Account ${stt} | Start ${taskCheck.length} Task!`)
            );
            for (let i = 0; i < taskCheck.length; i++) {
              let idTask = taskCheck[i].id;
              let nameTask = taskCheck[i].title;
              let rewardTask = taskCheck[i].reward;
              console.log(
                magenta.bold(
                  `[#] Account ${stt} | Check task: ${nameTask} - Reward ${rewardTask}`
                )
              );
              sleep(randomInt(5, 10));
              let claimT = await claimTask(stt, access_token, axios, idTask);
              if (claimT) {
                console.log(
                  green.bold(
                    `[#] Account ${stt} | Claimed task: ${nameTask} - Reward ${claimT.reward} - DONE`
                  )
                );
              }
              sleep(5);
            }
          }
        }
      }

      if (auto_upgrade_clock) {
        let { level } = data;

        if (level < max_level_clock && level != 4) {
          for (let i = level; i < max_level_clock; i++) {
            console.log(cyan.bold(`[#] Account ${stt} | Upgrade Clock...`));
            await sleep(randomInt(1, 4));
            let upClock = await levelUpgrade(stt, access_token, axios);
            if (upClock) {
              console.log(
                green.bold(
                  `[#] Account ${stt} | Upgrade Clock Lvl: ${
                    level + i
                  } Success!`
                )
              );
              await sleep(randomInt(2, 5));
            }
          }
        }
      }

      console.log(cyan.bold(`[#] Account ${stt} | Done!`));
    }
  } catch (e) {
    console.log(`Main Err: ${e}`);
  }
}
