import { TransactionUtil } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { DEFAULT_SLIPPAGE, newSdk } from "../config/cetus.js";
import { BN } from "bn.js";
import { OCEAN_COINTYPE, suiClient } from "../config/network.js";
import fetch from "node-fetch";

export const swap_OCEAN_SUI = async (
  sender = { address: "", privateKey: "", keyPair: null },
  amount,
  slippage = DEFAULT_SLIPPAGE
) => {
  return await swap(
    sender,
    OCEAN_COINTYPE,
    "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    amount,
    slippage
  );
};

export const swap = async (
  sender = { address: "", privateKey: "", keyPair: null },
  coinTypeA,
  coinTypeB,
  coinAAmount,
  slippage = DEFAULT_SLIPPAGE
) => {
  const sdk = newSdk();
  console.log(
    `>> [${sender.address}] Swap ${coinAAmount} ${coinTypeA} to ${coinTypeB} with slippage ${slippage}%`
  );
  const coinMap = new Map();
  const poolMap = new Map();

  const resp = await fetch("https://api-sui.cetus.zone/v2/sui/pools_info", {
    method: "GET",
  });
  const poolsInfo = await resp.json();

  if (poolsInfo.code === 200) {
    for (const pool of poolsInfo.data.lp_list) {
      if (pool.is_closed) {
        continue;
      }

      let coin_a = pool.coin_a.address;
      let coin_b = pool.coin_b.address;

      coinMap.set(coin_a, {
        address: pool.coin_a.address,
        decimals: pool.coin_a.decimals,
      });
      coinMap.set(coin_b, {
        address: pool.coin_b.address,
        decimals: pool.coin_b.decimals,
      });

      const pair = `${coin_a}-${coin_b}`;
      const pathProvider = poolMap.get(pair);
      if (pathProvider) {
        pathProvider.addressMap.set(Number(pool.fee) * 100, pool.address);
      } else {
        poolMap.set(pair, {
          base: coin_a,
          quote: coin_b,
          addressMap: new Map([[Number(pool.fee) * 100, pool.address]]),
        });
      }
    }
  }

  const coins = {
    coins: Array.from(coinMap.values()),
  };
  const paths = {
    paths: Array.from(poolMap.values()),
  };

  sdk.Router.loadGraph(coins, paths);

  // The first two addresses requiring coin types.
  const byAmountIn = false;
  const amount = new BN(coinAAmount * 1_000_000_000);
  const result = (
    await sdk.RouterV2.getBestRouter(
      coinTypeA,
      coinTypeB,
      amount,
      true,
      slippage,
      "",
      undefined,
      true,
      false
    )
  ).result;

  // if find the best swap router, then send transaction.
  if (!result?.isExceed) {
    const allCoinAsset = await sdk.getOwnerCoinAssets(sender.address);
    // If recipient not set, transfer objects move call will use ctx sender.
    const tx = await TransactionUtil.buildAggregatorSwapTransaction(
      sdk,
      result,
      allCoinAsset,
      "",
      slippage,
      sender.address
    );
    let rs = await suiClient.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: sender.keyPair(),
      requestType: "WaitForLocalExecution",
      options: {
        showBalanceChanges: true,
        showEffects: true,
      },
    });
    return rs;
  }

  return null;
};
