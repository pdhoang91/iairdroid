import { getDzook, sendDzook } from "../../utils/balance-bahamut.js";
import { getAllBahamutAddress } from "../../utils/wallet.js";
import exec from "../../utils/worker.js";

const MIN_DZOOK_TO_SEND = 0;
const MIN_DZOOK_FOR_SENDER = 0.1;
const DZOOK_TO_UPGRADE = 100;
const FROM = 25,
  TO = 40;

const main = async () => {
  let accountLv2s = [],
    accountLv1s = [];
  const accounts = await getAllBahamutAddress();

  (
    await Promise.all(
      accounts.map(
        async (account, i) =>
          await exec(async () => {
            const { address } = account;
            let dzook = await getDzook(address);
            return { dzook, account };
          })
      )
    )
  ).forEach((data, i) => {
    const { dzook } = data;
    if (dzook == 0) return;
    if (i >= FROM && i <= TO) {
      if (dzook >= DZOOK_TO_UPGRADE) return;
      accountLv1s.push(data);
    } else {
      accountLv2s.push(data);
    }
  });
  let sc = 0;
  for (let i = 0; i < accountLv1s.length; i++) {
    const { dzook: dzooklv1, account: accountlv1 } = accountLv1s[i];
    let missingDzook = DZOOK_TO_UPGRADE - dzooklv1 + 0.1,
      currentDzookLv1 = dzooklv1;
    let x = sc;
    while (x < accountLv2s.length && currentDzookLv1 < DZOOK_TO_UPGRADE) {
      if (missingDzook <= MIN_DZOOK_TO_SEND) {
        break;
      }
      const accountlv2Object = accountLv2s[x];
      const { dzook: dzooklv2, account: accountlv2 } = accountlv2Object;
      if (dzooklv2 <= MIN_DZOOK_FOR_SENDER) {
        x++;
        sc = x;
        if (sc == accountLv2s.length) {
          return;
        }
        continue;
      }
      let amount = missingDzook;
      if (missingDzook > dzooklv2) {
        amount = dzooklv2 - 0.1;
      }
      console.log(
        `\n>> Send ${amount} DZOOK from address #${accountlv2.id} (${accountlv2.address}) DZOOK=${dzooklv2} to address #${accountlv1.id}(${accountlv1.address}) DZOOK=${currentDzookLv1}`
      );
      try {
        await sendDzook(accountlv2, accountlv1.address, amount);
        missingDzook -= amount;
        accountlv2Object.dzook -= amount;
        currentDzookLv1 += amount;
      } catch (e) {
        console.error(e);
      }
    }
  }
};

main();
