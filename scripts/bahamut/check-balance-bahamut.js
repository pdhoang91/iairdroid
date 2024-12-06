import { getDzook, getFtn, getViva } from "../../utils/balance-bahamut.js";
import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBahamutAddress, getBahamutAddress } from "../../utils/wallet.js";

const { exec } = newSemaphore(10);

const main = async () => {
  const senders = await getAllBahamutAddress();
  let totalDzook = 0,
    totalViva = 0;
  let c = -1;
  await Promise.all(
    senders.map(
      async (sender, i) =>
        await exec(async () => {
          {
            const [ftn, dzook, viva] = await Promise.all([
              getFtn(sender.address),
              getDzook(sender.address),
              getViva(sender.address),
            ]);
            totalDzook += dzook;
            totalViva += viva;
            while (c < i) {
              if (c == i - 1) {
                console.log(
                  `${sender.id} ${sender.address} (${ftn.toFixed(6)} FTN, ${dzook.toFixed(2)} DZOOK, ${viva.toFixed(2)} VIVA)`
                );
                c++;
              }
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }
        })
    )
  );
  console.log(`total ${totalDzook} DZOOK, ${totalViva} VIVA`);
};

main();
