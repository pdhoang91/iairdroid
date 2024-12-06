import { seedphases } from "../../../config/secret.js";
import {
  getAccountLevelAndMultiple,
  getCurrentOcean,
  getTotalOceanToUpgrade,
  sendOcean,
} from "../../../utils/balance-ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress, getDerivativeAddress } from "../../../utils/wallet.js";
import exec from "../../../utils/worker.js";

const MIN_OCEAN_TO_SEND = 0.5;
const MIN_OCEAN_FOR_SENDER = 1;
const MAX_MESH_LV = 1;
const MAX_MESH_LV_WITH_BOOST = 6;
const MAX_BOAT_LV = 1;
const MAX_BOAT_LV_WITH_BOOST = 6;
const MAX_RETRY = 2;

const { exec: reqExec } = newSemaphore(2);
const { exec: sendExec } = newSemaphore(10);
const { exec: accountOperationExec } = newSemaphore(20);

const main = async () => {
  const secrets = await getAllOceanAddress();
  let supplierAccounts = [],
    receiverAccounts = [];

  await Promise.all(
    seedphases.map(
      async ({ name }) =>
        await Promise.all(
          Array.from(Array(99).keys()).map(
            async (i) =>
              await exec(async () => {
                const account = await getDerivativeAddress(name, i);
                const { address } = account;
                let retry = 0;
                while (retry < MAX_RETRY) {
                  retry++;
                  try {
                    let [ocean, { level, boat, multiple, exist }] = await Promise.all([
                      reqExec(() => getCurrentOcean(address)),
                      reqExec(() => getAccountLevelAndMultiple(address), 1.5),
                    ]);
                    let totalOceanNeeded =
                      getTotalOceanToUpgrade("mesh", level + 1, multiple > 1 ? MAX_MESH_LV_WITH_BOOST : MAX_MESH_LV) +
                      getTotalOceanToUpgrade("boat", boat + 1, multiple > 1 ? MAX_BOAT_LV_WITH_BOOST : MAX_BOAT_LV);
                    if (!exist || totalOceanNeeded == 0) {
                      supplierAccounts.push({
                        ocean,
                        account,
                        requiredOcean: totalOceanNeeded,
                        mesh: level,
                        boat,
                      });
                    } else {
                      receiverAccounts.push({
                        ocean,
                        account,
                        requiredOcean: totalOceanNeeded,
                        mesh: level,
                        boat,
                      });
                    }
                    return
                  } catch (e) {
                    account.error(e);
                  }
                }
              })
          )
        )
    )
  );
  await Promise.all(
    secrets.map(
      async (account) =>
        await exec(async () => {
          const { address } = account;
          let retry = 0;
          while (retry < MAX_RETRY) {
            retry++
            try {
              let [ocean, { level, boat, multiple, exist }] = await Promise.all([
                reqExec(() => getCurrentOcean(address)),
                reqExec(() => getAccountLevelAndMultiple(address), 1.5),
              ]);
              let totalOceanNeeded =
                getTotalOceanToUpgrade("mesh", level + 1, multiple > 1 ? MAX_MESH_LV_WITH_BOOST : MAX_MESH_LV) +
                getTotalOceanToUpgrade("boat", boat + 1, multiple > 1 ? MAX_BOAT_LV_WITH_BOOST : MAX_BOAT_LV);
              if (!exist || totalOceanNeeded == 0) {
                supplierAccounts.push({
                  ocean,
                  account,
                  requiredOcean: totalOceanNeeded,
                  mesh: level,
                  boat,
                });
              } else {
                receiverAccounts.push({
                  ocean,
                  account,
                  requiredOcean: totalOceanNeeded,
                  mesh: level,
                  boat,
                });
              }
              return
            } catch (e) {
              account.error(e)
            }
          }
        })
    )
  );
  console.log(`Found ${supplierAccounts.length} suppliers, ${receiverAccounts.length} receivers`)
  let totalHaving = supplierAccounts.reduce((total, { ocean }) => total + ocean, 0);
  let totalRequired = receiverAccounts.reduce((total, { requiredOcean }) => total + requiredOcean, 0);
  console.log(`Total required: ${totalRequired} OCEAN, having ${totalHaving} OCEAN!`)
  let finalReceiverAccounts = [];
  receiverAccounts.sort((a, b) => b.account.id - a.account.id);
  for (const receiverAccount of receiverAccounts) {
    if (totalRequired < totalHaving) {
      finalReceiverAccounts.push(receiverAccount)
    } else {
      supplierAccounts.push(receiverAccount)
      totalHaving += receiverAccount.ocean;
      totalRequired -= receiverAccount.requiredOcean;
    }
  }
  supplierAccounts.sort((a, b) => b.ocean - a.ocean);
  finalReceiverAccounts.sort((a, b) => a.account.id - b.account.id);
  console.log(`Recaculate, found ${supplierAccounts.length} suppliers, ${finalReceiverAccounts.length} receivers`)
  let sc = 0, tasks = [];
  for (let i = 0; i < finalReceiverAccounts.length; i++) {
    const {
      ocean: receiverOcean,
      account: receiverAccount,
      requiredOcean,
    } = finalReceiverAccounts[i];
    let missingOcean = requiredOcean - receiverOcean + 0.1,
      currentOceanLv1 = receiverOcean;
    let x = sc;
    while (x < supplierAccounts.length && currentOceanLv1 < requiredOcean) {
      if (missingOcean <= MIN_OCEAN_TO_SEND) {
        break;
      }
      const supplierAccountObj = supplierAccounts[x];
      const { ocean: supplierOcean, account: supplierAccount } =
        supplierAccountObj;
      if (supplierOcean <= MIN_OCEAN_FOR_SENDER) {
        x++;
        sc = x;
        if (sc == supplierAccounts.length) {
          break;
        }
        continue;
      }
      let amount = missingOcean;
      if (missingOcean > supplierOcean) {
        amount = supplierOcean - 0.1;
      }
      const task = () => supplierAccount.exec(() => sendExec(async () => {
        let retry = 0;
        while (retry < MAX_RETRY) {
          try {
            supplierAccount.log(
              `Send ${amount} OCEAN to address #${receiverAccount.id} (${receiverAccount.address}) (${retry})`
            );
            const response = await reqExec(() => sendOcean(
              supplierAccount,
              receiverAccount.address,
              amount
            ), 0.5);
            supplierAccount.log(`Sent to ${receiverAccount.id} ${amount} OCEAN!`)
            if (response?.effects?.status?.status != "success") {
              throw new Error(`Sending fail, response: ${JSON.stringify(response)}`);
            }
            return
          } catch (e) {
            retry++;
            supplierAccount.error(e);
          }
        }
      }))
      tasks.push({ secret: supplierAccount, task })
      missingOcean -= amount;
      supplierAccountObj.ocean -= amount;
      currentOceanLv1 += amount;
    }
  }
  console.log(`Execute ${tasks.length} tasks...`)
  await Promise.all(tasks.map(({ secret, task }) => accountOperationExec(async () => {
    try {
      await task()
    } catch (e) {
      secret.error(e);
    }
  })))
  console.log(`Done ${tasks.length} tasks!`)
};

main();
