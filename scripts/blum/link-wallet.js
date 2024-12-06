import { newSemaphore } from "../../utils/semaphore.js";
import { getAllBlumAddress } from "../../utils/wallet.js";
import {
  connectWallet,
  disconnectWallet,
  generateBlumTonProof,
  getWalletBalance,
  login,
  prepareConnectRequestBody,
} from "../../utils/blum.js";
import { Address } from "@ton/core";
import { nonBounceableFmt } from "../../utils/balance-ton.js";

const { exec } = newSemaphore(100);

const main = async () => {
  let secrets = await getAllBlumAddress();
  await Promise.all(
    secrets.map(
      async (secret) =>
        await exec(async () => {
          {
            while (true) {
              try {
                await login(secret);
                let walletInfo = await getWalletBalance(secret);
                const address = (await secret.getWallet())?.address;
                if (!address) {
                  secret.log(` Missing seed phases`);
                  return;
                }
                const nonBounceAddress = nonBounceableFmt(address);
                if (walletInfo && walletInfo.address != nonBounceAddress) {
                  secret.log(`Delete wallet ${walletInfo.address}`);
                  await disconnectWallet(secret);
                  walletInfo = null;
                  secret.log(`Delete wallet SUCCESS!`);
                }

                if (!walletInfo) {
                  const connectWalletBody = await prepareConnectRequestBody(
                    secret
                  );
                  if (!connectWalletBody) return;
                  const connectAddress = nonBounceableFmt(
                    Address.parse(connectWalletBody.account.address)
                  );
                  secret.log(`Connect with address ${connectAddress}`);
                  await connectWallet(secret, connectWalletBody);
                  secret.log(`Connect with address ${connectAddress} success!`);
                }
                return
              } catch (e) {
                // console.error(e);
                secret.error(`ERROR: ${e?.message || e}`);
              }
            }
          }
        })
    )
  );
};

main();
