import { getAccountLevelAndMultiple, getCurrentSui, updateRef } from "../../../utils/balance-ocean.js";
import { sleep } from "../../../utils/helper.js";
import { getFriends, login, updateRefferal } from "../../../utils/ocean.js";
import { newSemaphore } from "../../../utils/semaphore.js";
import { getAllOceanAddress } from "../../../utils/wallet.js";

const { exec } = newSemaphore(100);
const { exec: reqExec } = newSemaphore(2);
const MAX_REF_PER_ACCOUNT = 1;
const MAX_RETRY = 2;
const MIN_SUI = 0.01;
const MIN_BOAT_TO_GET_REF = 4;

const main = async () => {
  const secrets = await getAllOceanAddress();
  const friendMap = {}, inviterMap = {}, missingRefList = [];
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                const { boat, exist } = await reqExec(() => getAccountLevelAndMultiple(secret.address), 1.5);
                if (!exist) return
                await login(secret);
                const friends = await getFriends(secret);
                const friendList = friendMap[secret.address] || []
                friends.forEach(({ wallet_address }) => {
                  if (!friendList.find((address) => address == wallet_address)) {
                    friendList.push(wallet_address);
                  }
                  inviterMap[wallet_address] = secret.address;
                })
                friendMap[secret.address] = friendList;
                if (friends.length < MAX_REF_PER_ACCOUNT && boat > MIN_BOAT_TO_GET_REF) {
                  missingRefList.push({ address: secret.address, currentRef: friends.length });
                }
                return;
              } catch (e) {
                // console.error(e);
                // secret.error(e);
                secret.log(`ERROR: ${e?.message}`);
                await sleep(5);
              }
            }
          }
        })
    )
  );
  const availableForRef = secrets.filter((secret) => {
    const inviterAddress = inviterMap[secret.address];
    if (!inviterAddress) return true;
    let inviterFriendList = friendMap[inviterAddress] || []
    if (inviterFriendList.length <= MAX_REF_PER_ACCOUNT) {
      return false
    } else {
      friendMap[inviterAddress] = inviterFriendList.filter((address) => address != secret.address);
      return true
    }
  })
  const getNextRefAddress = () => {
    const nextRef = missingRefList.find(({ currentRef }) => currentRef < MAX_REF_PER_ACCOUNT)
    if (!nextRef) return null
    nextRef.currentRef += 1;
    return nextRef.address;
  }
  console.log(`Loaded friend list of ${Object.keys(friendMap).length} users`);
  console.log(`Found ${missingRefList.length} account missing refs`);
  console.log(`Found ${availableForRef.length} accounts available for refs`);
  availableForRef.map(async (secret) => await secret.exec(async () => {
    while (true) {
      try {
        const sui = await reqExec(() => getCurrentSui(secret.address))
        if (sui < MIN_SUI) {
          secret.log(`Not enough sui to run, current having ${sui} SUI, quit!`)
          return
        }
        break
      } catch (e) {
        secret.error(e);
        await sleep(1);
      }
    }
    const refAddress = getNextRefAddress()
    if (!refAddress) return
    let retry = 0, updateOnchain = false;
    while (retry < MAX_RETRY) {
      try {
        retry++;
        if (!updateOnchain) {
          secret.log(`Add ref for address ${refAddress} onchain (${retry})`);
          const response = await reqExec(() => updateRef(secret, refAddress), 0.5)
          if (response.effects.status.status != "success") {
            throw new Error(
              response?.effects?.status?.error ||
              `Sending fail, response: ${JSON.stringify(response)}`
            );
          }
          secret.log(`Add ref for address ${refAddress} onchain SUCCESS!`);
          updateOnchain = true
        }
        secret.log(`Add ref for address ${refAddress} offchain (${retry})`);
        await updateRefferal(secret, refAddress);
        secret.log(`Add ref for address ${refAddress} offchain SUCCESS!`);
        return
      } catch (e) {
        secret.error(e);
        await sleep(1);
      }
    }

  }))
};

main();
