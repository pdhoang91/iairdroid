import { fileURLToPath } from "url";
import { CREDIT_ADDRESS } from "../../../config/network.js";
import { addToSecretVault } from "../../../config/secret-manager.js";
import {
  getCurrentOcean,
  getCurrentSui,
  getGasPerSendTx,
  sendOcean,
  sendSui,
} from "../../../utils/balance-ocean.js";
import { calculateComission } from "../../utils/comission.js";
import fs from "fs";
import path from "path";
import { MIN_OCEAN_COMMISSION_TO_HARVEST } from "../../../config/account.js";

const GET_GAS_BACK = false;
const COLLECT = false;

const main = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __basepath = path.resolve(path.dirname(__filename), "..");
  const fileData = fs.readFileSync(
    __basepath + "/config/sponsor-account.private.csv"
  );
  const fileName = "sponsor-account.private.csv";
  const secrets = await addToSecretVault(fileName, fileData.toString());
  for (const sender of secrets) {
    console.log("               ---------------");
    let sendBack = true;
    try {
      const {
        totalClaim,
        totalPay,
        totalBillAmount,
        debt,
        totalClaimTx,
        totalPayTx,
        lastPayDate,
      } = await calculateComission(
        sender.address,
        CREDIT_ADDRESS,
        sender.comission,
        sender.startDate
      );
      console.log(
        `>> ${sender.fileName}#${sender.id} (${sender.address
        }) dùng dịch vụ từ ngày ${sender.startDate.toLocaleString()} đã claim tổng cộng ${totalClaimTx} lần (${totalClaim.toFixed(
          2
        )} OCEAN) phí hoa hồng là ${totalBillAmount.toFixed(2)} OCEAN (${sender.comission * 100
        }%), đã thanh toán ${totalPay.toFixed(2)} OCEAN, nợ ${debt.toFixed(
          2
        )} OCEAN ${lastPayDate
          ? `(thu tiền lần cuối vào lúc ${lastPayDate.toLocaleString()})`
          : ""
        }`
      );
      if (!COLLECT) continue
      const [sui, ocean] = await Promise.all([
        getCurrentSui(sender.address),
        getCurrentOcean(sender.address),
      ]);
      console.log(
        `${fileName}#${sender.id} (${sender.address}) SUI=${sui} OCEAN=${ocean}`
      );
      if (debt <= 0) {
        console.log("no debt! good!");
        continue;
      }
      let sendAmount = debt;
      if (debt >= ocean) {
        sendAmount = ocean;
      }
      if (sendAmount <= MIN_OCEAN_COMMISSION_TO_HARVEST) {
        console.log(
          `not enough money or the collect amount is smaller than min (${MIN_OCEAN_COMMISSION_TO_HARVEST} OCEAN)! Current OCEAN = ${ocean}`
        );
        sendBack = false;
        continue;
      }
      console.log(`>> collect ${sendAmount} OCEAN`);

      const response = await sendOcean(sender, CREDIT_ADDRESS, sendAmount);
      if (!response) {
        continue;
      }
      if (response.effects.status.status != "success") {
        console.log(`Sending fail, response: ${JSON.stringify(response)}`);
        continue;
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!COLLECT) continue
      try {
        if (!sendBack) continue;
        if (sender.receiveAddress) {
          const ocean = await getCurrentOcean(sender.address);
          if (ocean == 0) {
            continue;
          }
          console.log(
            `send back ${ocean} OCEAN to address ${sender.receiveAddress}`
          );
          const response = await sendOcean(
            sender,
            sender.receiveAddress,
            ocean
          );
          if (!response) {
            continue;
          }
          if (response.effects.status.status != "success") {
            console.log(`Sending fail, response: ${JSON.stringify(response)}`);
            continue;
          }
        }
      } finally {
        if (GET_GAS_BACK) {
          const sui = await getCurrentSui(sender.address);
          const sendAmount = sui - await getGasPerSendTx();
          if (sendAmount >= 0) {
            console.log(`Collect gas ${sendAmount} SUI`);
            const response = await sendSui(sender, CREDIT_ADDRESS, sendAmount);
            if (!response) {
              continue;
            }
            if (response.effects.status.status != "success") {
              console.log(
                `Sending fail, response: ${JSON.stringify(response)}`
              );
              continue;
            }
          }
        }
      }
    }

    console.log(
      `${fileName}#${sender.id} (${sender.address}) SUI=${await getCurrentSui(
        sender.address
      )} OCEAN=${await getCurrentOcean(sender.address)}`
    );
  }
};

main();
