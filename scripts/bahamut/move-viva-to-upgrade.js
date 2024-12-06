import { getViva, sendViva } from "../../utils/balance-bahamut.js";
import { getAllBahamutAddress } from "../../utils/wallet.js";
import exec from "../../utils/worker.js";

const MIN_VIVA_TO_SEND = 0;
const MIN_VIVA_FOR_SENDER = 0.1;
const VIVA_TO_UPGRADE = 100;
const FROM = 9,
  TO = 21;

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
            let viva = await getViva(address);
            return { viva, account };
          })
      )
    )
  ).forEach((data, i) => {
    const { viva } = data;
    if (viva == 0) return;
    if (i >= FROM && i <= TO) {
      if (viva >= VIVA_TO_UPGRADE) return;
      accountLv1s.push(data);
    } else {
      accountLv2s.push(data);
    }
  });
  let sc = 0;
  for (let i = 0; i < accountLv1s.length; i++) {
    const { viva: vivalv1, account: accountlv1 } = accountLv1s[i];
    let missingViva = VIVA_TO_UPGRADE - vivalv1 + 0.1,
      currentVivaLv1 = vivalv1;
    let x = sc;
    while (x < accountLv2s.length && currentVivaLv1 < VIVA_TO_UPGRADE) {
      if (missingViva <= MIN_VIVA_TO_SEND) {
        break;
      }
      const accountlv2Object = accountLv2s[x];
      const { viva: vivalv2, account: accountlv2 } = accountlv2Object;
      if (vivalv2 <= MIN_VIVA_FOR_SENDER) {
        x++;
        sc = x;
        if (sc == accountLv2s.length) {
          return;
        }
        continue;
      }
      let amount = missingViva;
      if (missingViva > vivalv2) {
        amount = vivalv2 - 0.1;
      }
      console.log(
        `\n>> Send ${amount} VIVA from address #${accountlv2.id} (${accountlv2.address}) VIVA=${vivalv2} to address #${accountlv1.id}(${accountlv1.address}) VIVA=${currentVivaLv1}`
      );
      try {
        await sendViva(accountlv2, accountlv1.address, amount);
        missingViva -= amount;
        accountlv2Object.viva -= amount;
        currentVivaLv1 += amount;
      } catch (e) {
        console.error(e);
      }
    }
  }
};

main();
