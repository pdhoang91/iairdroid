import { MIN_OCEAN_COMMISSION_TO_HARVEST } from "../../config/account.js";
import { CREDIT_ADDRESS } from "../../config/network.js";
import { getSecretsByFileName } from "../../config/secret-manager.js";
import {
  getAccountClaimHour,
  getCurrentOcean,
  getCurrentSui,
  getLatestClaimTx,
  sendOcean,
} from "../../utils/balance-ocean.js";
import { calculateComission } from "../../utils/comission-ocean.js";
import { newSemaphore } from "../../utils/semaphore.js";

const { worker, exec } = newSemaphore(1);
let log = console.log;

export const setup = (logFn) => {
  log = logFn;
};

export const collectComissionForFile = async (fileName) => {
  const secrets = await getSecretsByFileName(fileName);
  await Promise.all(
    secrets.map(async (sender) => {
      await collectComissionWithPool(sender);
    })
  );
  while (true) {
    await new Promise((resolve) => setTimeout(() => resolve(), 1000000));
  }
};

const collectComissionWithPool = async (sender) => {
  return await exec(async () => await collectComission(sender));
};

const collectComissionWithPoolAfter = (sender, timeout) => {
  log(
    `>> Đặt lịch lấy hoa hồng ${sender.fileName}#${sender.id} (${
      sender.address
    }) sau ${(timeout / (1000 * 60)).toFixed(0)} phút`
  );
  setTimeout(() => collectComissionWithPool(sender), timeout + 1000);
};

const collectComission = async (sender) => {
  try {
    if (sender.comission == 0) return;
    const {
      totalClaim,
      totalPay,
      totalBillAmount,
      debt,
      totalClaimTx,
      lastPayDate,
    } = await calculateComission(
      sender.address,
      CREDIT_ADDRESS,
      sender.comission,
      sender.startDate
    );
    let nextTime = new Date(lastPayDate || sender.startDate);
    nextTime.setHours(nextTime.getHours() + 12);
    nextTime -= new Date();
    if (nextTime > 0) {
      collectComissionWithPoolAfter(sender, nextTime);
      return;
    }
    log(
      `>> ${sender.fileName}#${sender.id} (${
        sender.address
      }) dùng dịch vụ từ ngày ${sender.startDate.toLocaleString()} đã claim tổng cộng ${totalClaimTx} lần (${totalClaim.toFixed(
        2
      )} OCEAN) phí hoa hồng là ${totalBillAmount.toFixed(2)} OCEAN (${
        sender.comission * 100
      }%), đã thanh toán ${totalPay.toFixed(2)} OCEAN, nợ ${debt.toFixed(
        2
      )} OCEAN ${
        lastPayDate
          ? `(thu tiền lần cuối vào lúc ${lastPayDate.toLocaleString()})`
          : ""
      }`
    );
    if (debt <= 0) {
      await collectAfterNextClaim(sender);
      return;
    }
    const [sui, ocean] = await Promise.all([
      getCurrentSui(sender.address),
      getCurrentOcean(sender.address),
    ]);
    let sendAmount = debt;
    if (debt >= ocean) {
      sendAmount = ocean - 0.1;
    }
    if (sendAmount <= 0 || sendAmount < MIN_OCEAN_COMMISSION_TO_HARVEST) {
      log(
        `>> ${sender.fileName}#${sender.id} (${sender.address}) không có đủ tiền trả hoặc chưa đạt số tiền thu tối thiểu (${MIN_OCEAN_COMMISSION_TO_HARVEST} OCEAN), số dư ${ocean} OCEAN, nợ ${debt} OCEAN`
      );
      await collectAfterNextClaim(sender);
      return;
    }
    log(
      `>> ${sender.fileName}#${sender.id} (${
        sender.address
      }) Thu hoạch ${sendAmount.toFixed(
        2
      )} OCEAN tiền hoa hồng vào tài khoản ${CREDIT_ADDRESS} (SUI=${sui.toFixed(
        2
      )} OCEAN=${ocean.toFixed(2)})`
    );

    const response = await sendOcean(sender, CREDIT_ADDRESS, sendAmount);
    if (!response) {
      log(
        `>> ${sender.fileName}#${sender.id} (${sender.address}) Không có phản hồi từ node`
      );
      collectComissionWithPoolAfter(sender, 10 * 60000); // claim after 10p
      return;
    }
    if (response.effects.status.status != "success") {
      log(
        `>> ${sender.fileName}#${sender.id} (${
          sender.address
        }) Gửi giao dịch thất bại: ${JSON.stringify(response)}`
      );
      collectComissionWithPoolAfter(sender, 10 * 60000); // claim after 10p
      return;
    }
    if (sendAmount < debt) {
      await collectAfterNextClaim(sender);
      return;
    }
    collectComissionWithPoolAfter(sender, 12 * 60 * 60000); // claim after 12h
  } catch (e) {
    log(`err: ${JSON.stringify(e)}`);
    collectComissionWithPoolAfter(sender, 10 * 60000); // claim after 10p
  }
};

const collectAfterNextClaim = async (sender) => {
  let [latestClaim, claimHour] = await Promise.all([
    getLatestClaimTx(sender.address),
    getAccountClaimHour(sender.address),
  ]);
  if (latestClaim) {
    let nextTime = new Date(latestClaim);
    nextTime.setHours(nextTime.getHours() + claimHour);
    nextTime -= new Date();
    if (nextTime > 0) {
      collectComissionWithPoolAfter(sender, nextTime + 10000);
      return;
    } else {
      collectComissionWithPoolAfter(sender, claimHour * 60 * 60000 + 10000); // collect after 2h
      return;
    }
  } else {
    collectComissionWithPoolAfter(sender, claimHour * 60 * 60000 + 10000); // collect after 2h
    return;
  }
};
