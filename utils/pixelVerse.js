import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import fs from "fs";
import moment from "moment";
import readline from "readline";

const headers = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "content-type": "application/json",
  origin: "https://sexyzbot.pxlvrs.io",
  priority: "u=1, i",
  referer: "https://sexyzbot.pxlvrs.io/",
  "sec-ch-ua":
    '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

export const newPixelVerseClientWithProxy = (
  proxy,
  initData,
  log = console.log
) => {
  const param = {
    baseURL: "https://api-clicker.pixelverse.xyz",
    headers: { ...headers, initdata: initData },
  };
  if (proxy) {
    const { user, passsword, ip, port } = proxy;
    const proxyStr = `http://${user}:${passsword}@${ip}:${port}`;
    param.httpsAgent = new HttpsProxyAgent(proxyStr);
    log(`Tạo PixelVerse client với proxy ${ip}:${port}`);
  }
  return axios.create(param);
};

export const getUserData = async (secret) => {
  const url = "/api/users";
  const response = await secret.client.get(url);
  return response.data;
};

export const getBalance = async (secret) => {
  const userData = await getUserData(secret);
  return userData.clicksCount.toLocaleString("id-ID") || -1;
};

export const getProgress = async (secret) => {
  const url = "/api/mining/progress";
  const response = await secret.client.get(url);
  return response.data;
};

export const getPetsData = async (secret) => {
  const url = "/api/pets";
  const response = await secret.client.get(url);
  return response.data;
};

export const getPixelLevel = async (secret) => {
  const url = "/api/levels/my";
  const response = await secret.client.get(url);
  return response.data;
};

export const startLevelUp = async (secret) => {
    const response = await secret.client.post("/api/levels/levelup/start");
    return response.data;
};

export const skipLevelUp = async (secret) => {
    const response = await secret.client.post("/api/levels/levelup/skip");
    return response.data;
};

export const finishLevelUp = async (secret) => {
    const response = await secret.client.post("/api/levels/levelup/finish");
    return response.data;
};

export const claimBalance = async (secret) => {
  const url = "/api/mining/claim";
  const response = await secret.client.post(url, {});
  return response.data;
};

export const calculateTimeDifference = (lastBuyTimeStr) => {
  const lastBuyTime = moment.utc(lastBuyTimeStr);
  const currentTime = moment.utc();
  const duration = moment.duration(currentTime.diff(lastBuyTime));
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  console.log(`\r[ Buy Pet ] : Trong vòng ${hours} giờ ${minutes} phút`);
};

export const animatedLoading = (durationInMilliseconds) => {
  const frames = ["|", "/", "-", "\\"];
  const endTime = Date.now() + durationInMilliseconds;
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const remainingTime = Math.floor((endTime - Date.now()) / 1000);
      const frame = frames[Math.floor(Date.now() / 250) % frames.length];
      process.stdout.write(
        `\rChờ đợi lần yêu cầu tiếp theo ${frame} - Còn lại ${remainingTime} giây...`
      );
      if (Date.now() >= endTime) {
        clearInterval(interval);
        process.stdout.write("\rĐang chờ yêu cầu tiếp theo được hoàn thành.\n");
        resolve();
      }
    }, 250);
  });
};

export const upgradePetIfNeeded = async (secret, maxLevel, exec) => {
  const petsData = await getPetsData(secret);
  if (petsData) {
    for (const pet of petsData.data) {
      let currentLevel = pet.userPet.level;
      while (currentLevel < maxLevel) {
        const petId = pet.userPet.id;
        const upgradeUrl = `/api/pets/user-pets/${petId}/level-up`;
        try {
          const upgradeResponse = await secret.client.post(upgradeUrl, {});
          currentLevel = currentLevel + 1;
          console.log(
            `\r[ Upgrade Pet ][${secret.id}] : ${pet.name} đã nâng cấp thành công lên Lv. ${currentLevel}`
          );
        } catch (error) {
          throw error;
        }
      }
    }
  } else {
    console.error(
      `\r[ Upgrade Pet ][${secret.id}] : Không lấy được dữ liệu pet`
    );
  }
};

export const buyPet = async (secret) => {
  const url = `/api/pets/buy`;
  const res = await secret.client.post(url, {});
  console.log(
    `\r[ Buy New Pet ][${secret.id}] : đã mua pet mới: ${res.data.pet.name} `
  );
};

export const checkDailyRewards = async (secret) => {
  const url = "/api/daily-rewards";
  const response = await secret.client.get(url);
  const data = response.data;
  const totalClaimed = data.totalClaimed;
  const day = data.day;
  const rewardAmount = data.rewardAmount;
  const todaysRewardAvailable = data.todaysRewardAvailable;
  const statusKlaim = todaysRewardAvailable
    ? "Chưa được yêu cầu"
    : "Đã được yêu cầu";
  if (todaysRewardAvailable) {
    console.log(
      `\r[ Check Daily Reward ] : Bắt đầu claim daily reward day ${day} Amount=${rewardAmount}, Status=${statusKlaim}, TotalClaimed=${totalClaimed}`
    );
    await claimDailyReward(secret);
    return true;
  }
  return false;
};

export const claimDailyReward = async (secret) => {
  const url = "/api/daily-rewards/claim";
  const response = await secret.client.post(url, {});
  const data = response.data;
  const day = data.day;
  const amount = data.amount;
  console.log(
    `\r[Claim Daily Reward ] : Claim thành công | Day ${day} | Amount: ${amount}`
  );
  return data;
};

export const claimDailyCombo = async (secret, userInputOrder) => {
  const response = await secret.client.get("/api/cypher-games/current");
  if (response.status === 200) {
    const data = response.data;
    const comboId = data.id;
    const options = data.availableOptions;
    const jsonData = {};

    const urlToIdMap = {};
    options.forEach((option) => {
      const url = option.imageUrl;
      const match = url.match(/_(\d+)\.png$/);
      if (match) {
        const number = match[1];
        urlToIdMap[number] = option.id;
      }
    });
    userInputOrder.forEach((order, index) => {
      const id = urlToIdMap[order];
      if (id) {
        jsonData[id] = index;
      }
    });

    const answerResponse = await secret.client.post(
      `/api/cypher-games/${comboId}/answer`,
      jsonData
    );
    if (answerResponse.status !== 400) {
      const answerData = answerResponse.data;
      const jumlah = answerData.rewardAmount;
      const percent = answerData.rewardPercent;
      console.log(
        `\r[ Daily Combo ] [${secret.id}] : Claim thành công ${jumlah} | ${percent}%`
      );
    } else {
      const answerData = answerResponse.data;
      console.error(
        `\r[ Daily Combo ] [${secret.id}]  : Không thể claim ${answerData.message}`
      );
      return null;
    }
  } else {
    const responseData = response.data;
    if (responseData.code === "BadRequestException") {
      console.error(
        `\r[ Daily Combo ] [${secret.id}] : Bạn đã claim daily combo hôm nay`
      );
    } else {
      console.error(
        `\r[ Daily Combo ] [${secret.id}] : Không lấy được dữ liệu combo`
      );
    }
    return null;
  }
};
const main = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) =>
    new Promise((resolve) => rl.question(query, resolve));

  const autoUpgradePet = (
    await question("Tự động nâng cấp pet? (mặc định no) (y/n): ")
  )
    .trim()
    .toLowerCase();
  let maxLevelPet = 10;
  if (autoUpgradePet === "y") {
    const inputLevel = await question(
      "Bro muốn nâng đến lv bao nhiêu? (mặc định 10 ) : "
    );
    maxLevelPet = inputLevel ? parseInt(inputLevel, 10) : 10;
  }

  const autoDailyCombo = (
    await question("Tự động pick Daily Combo? (mặc định no) (y/n): ")
  )
    .trim()
    .toLowerCase();
  let userInputOrder = [];
  if (autoDailyCombo === "y") {
    const userInput = await question("Nhập theo số pet trên nhóm: ");
    userInputOrder = userInput.split(",").map((x) => parseInt(x.trim(), 10));
  }

  rl.close();

  while (true) {
    printWelcomeMessage();
    try {
      const queries = fs
        .readFileSync("query.txt", "utf-8")
        .split("\n")
        .map((line) => line.trim());
      const proxies = fs
        .readFileSync("proxy.txt", "utf-8")
        .split("\n")
        .map((line) => line.trim());

      for (let i = 0; i < queries.length; i++) {
        const queryData = queries[i];
        const proxy = proxies[i % proxies.length];

        await checkProxyIP(proxy);

        const userResponse = await getUserData(queryData, proxy);

        if (userResponse) {
          const username = userResponse.username || "Không có tên người dùng";
          const clicksCount = userResponse.clicksCount.toLocaleString("id-ID");
          const pet = userResponse.pet || {};
          const levelUpPrice = pet.levelUpPrice
            ? pet.levelUpPrice.toLocaleString("id-ID")
            : "N/A";
          const petDetails = `Level: ${pet.level || "N/A"} | Năng lượng: ${
            pet.energy || "N/A"
          } | Tăng cấp pet cần: ${levelUpPrice}`;
          console.log(`\n========[ ${username} ]========`);
          console.log(`[ Balance ] : ${clicksCount}`);
          console.log(`[ Active Pet ] : ${petDetails}`);
          console.log(`[ Pets ] : Lấy dữ liệu pet...`);

          const petsData = await getPetsData(queryData, proxy);
          if (petsData) {
            petsData.data.forEach((pet) => {
              const petLevel = pet.userPet.level;
              console.log(`[ Pets ] : ${pet.name} | Lv. ${petLevel}`);
            });
          } else {
            console.error(`[ Pets ] : Không lấy được dữ liệu pet`);
          }

          if (autoUpgradePet === "y") {
            console.log(`[ Upgrade Pet ] : Nâng cấp pet`);
            await upgradePetIfNeeded(queryData, maxLevelPet, proxy);
          }

          const cekProgress = await getProgress(queryData, proxy);
          if (cekProgress) {
            const data = cekProgress;
            const maxCoin = data.maxAvailable.toLocaleString("id-ID");
            const canClaim = data.currentlyAvailable.toLocaleString("id-ID");
            const minClaim = data.minAmountForClaim.toLocaleString("id-ID");
            const fullClaim = moment(data.nextFullRestorationDate).format(
              "H [giờ] m [phút]"
            );
            const restoreSpeed = data.restorationPeriodMs;
            console.log(
              `[ Progress ] : Max Claim: ${maxCoin} | Min Claim: ${minClaim}`
            );
            console.log(
              `[ Progress ] : Có thể Claim: ${canClaim} | Full Claim: ${fullClaim}`
            );
            console.log(`[ Progress ] : Khôi phục tốc độ: ${restoreSpeed}`);
            console.log(`[ Claim ] : Bắt đầu claim...`);

            const claim = await claimBalance(queryData, proxy);
            if (claim) {
              const claimedAmount = claim.claimedAmount || 0;
              const amount = claimedAmount.toLocaleString("id-ID");
              console.log(`[ Claim ] : Claim thành công ${amount}`);
            } else {
              console.error(`[ Claim ] : Thất bại`);
            }
          } else {
            console.error(`[ Progress ] : kiểm tra không thành công`);
          }

          console.log(`[ Daily Reward ] : Kiểm tra...`);
          await checkDailyRewards(queryData);

          if (autoDailyCombo === "y") {
            await claimDailyCombo(queryData, userInputOrder, proxy);
          }
        } else {
          console.error(`\n======= Truy vấn sai =======`);
        }
      }

      console.log("Nghỉ ngơi 8 giờ trước khi chạy lại...");
      await animatedLoading(8 * 60 * 60 * 1000); // 8 giờ
    } catch (error) {
      console.error(`Đã xảy ra lỗi: ${error.message}`);
    }
  }
};

export const getLinkedWallets = async(secret) => {
  const response = await secret.client.get("/api/wallets/my");
  return response.data;
}

export const linkWallet = async(secret, address) => {
  const response = await secret.client.post("/api/wallets/bind", {
    address,
    memo: null,
    provider: "TRUST_WALLET",
  });
  if (response.status == 201) return response.data;
  throw response.data;
}

export const removeWallet = async(secret, addressId) => {
  const response = await secret.client.post(`/api/wallets/${addressId}/unbind`, null);
  if (response.status == 201) return response.data;
  throw response.data;
}

export const getTasks = async(secret) => {
  const response = await secret.client.get(`/api/tasks/my`);
  return response.data;
}

export const startTask = async(secret, taskId) => {
    const response = await secret.client.post(`/api/tasks/start/${taskId}`);
    return response.data
}

export const checkTelegramTask = async(secret, taskId) => {
    const response = await secret.client.post(`/api/telegram-tasks/subscribe/${taskId}/check`);
    return response.data;
}

export const checkUserTask = async(secret, taskId) => {
    const response = await secret.client.post(`/api/user-tasks/${taskId}/check`);
    return response.data;
}

const startTime = moment();

// if (require.main === module) {
//     main();
// }
