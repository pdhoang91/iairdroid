import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
  CLOCK_SHARE_OBJECT_ID,
  EVENT_TYPE_CREATE_USER,
  GAME_FIRST_TX_OBJECT_TYPE,
  GAME_SHARE_OBJECT_ID,
  OCEAN_COINTYPE,
  SUI_COINTYPE,
  getItem,
  getItemObj,
  removeItem,
  setItem,
  suiClient,
} from "../config/network.js";
import { MIN_COIN_TO_MERGE } from "../config/account.js";
import { newSemaphore } from "./semaphore.js";

const {exec} = newSemaphore()

export const getBalance = async (address, coinType) => {
  const balance = await suiClient.getBalance({ owner: address, coinType });
  return balance;
};

export const getBalanceNumber = async (address, coinType) => {
  const { totalBalance } = await getBalance(address, coinType);
  return totalBalance / 1_000_000_000;
};

export const getCurrentSui = async (address) => {
  return await getBalanceNumber(address, SUI_COINTYPE);
};

export const getCurrentOcean = async (address) => {
  return await getBalanceNumber(address, OCEAN_COINTYPE);
};

export const getAllCoinType = async (address, coinType, cursor = undefined) => {
  const coins = await suiClient.getCoins({
    owner: address,
    cursor,
    limit: 50,
    coinType: coinType,
  });
  if (coins.hasNextPage && cursor != coins.nextCursor)
    return [
      ...coins.data,
      ...(await getAllCoinType(address, coinType, coins.nextCursor)),
    ];
  return coins.data;
};

export const getAllCoin = async (address, cursor) => {
  const coins = await suiClient.getCoins({
    owner: address,
    cursor,
    limit: 500,
  });
  if (coins.hasNextPage && cursor != coins.nextCursor)
    return [...coins.data, ...(await getAllCoin(address, coins.nextCursor))];
  return coins.data;
};

export const getGasPerSendTx = async () => {
  const gasPrice = await getReferenceGasPrice();
  const gasBudget = Number(gasPrice) / 100_000;
  return gasBudget;
};

const getReferenceGasPriceKey = "sui.gasPrice"
export const getReferenceGasPrice = async (allowCache = true) => {
  return await exec(async() => {
    let cacheData = getItem(getReferenceGasPriceKey);
    let gasPrice = cacheData ? cacheData.data : null;
    if (allowCache && gasPrice) return BigInt(gasPrice);
    console.log("Get gas price...");
    gasPrice = await suiClient.getReferenceGasPrice();
    setItem(getReferenceGasPriceKey, Number(gasPrice), 60 * 60_000);
    return gasPrice;
  })
};

export const sendCoin = async (
  coinType,
  sender = { address: "", privateKey: "", keyPair: null },
  receiverAddress,
  amount,
  isSendAll = false
) => {
  const suiCoins = await getAllCoin(sender.address);
  const tx = new TransactionBlock();
  const finalAmount = parseInt(amount * 1_000_000_000);

  const gasPrice = await getReferenceGasPrice();
  const gasBudget = gasPrice * 10_000n;
  tx.setGasBudget(gasBudget);
  tx.setGasPrice(gasPrice);
  tx.setGasPayment(
    suiCoins.map((coin) => ({
      version: coin.version,
      digest: coin.digest,
      objectId: coin.coinObjectId,
    }))
  );
  if (coinType == SUI_COINTYPE) {
    tx.setGasPayment(
      suiCoins.map((coin) => ({
        version: coin.version,
        digest: coin.digest,
        objectId: coin.coinObjectId,
      }))
    );
    const [coinIn] = tx.splitCoins(tx.gas, [tx.pure(finalAmount)]); // lấy phần cần chuyển
    tx.transferObjects([coinIn], tx.pure(receiverAddress, "address")); // chuyển đến người nhận
  } else {
    const coins = await getAllCoinType(sender.address, coinType);
    if (!coins) {
      console.log("[ERR] no coin found");
      return null;
    }
    if (coins.length > 500) {
      await mergeCoin(coinType, sender, 1);
      return await sendCoin(coinType, sender, receiverAddress, amount, isSendAll);
    }
    const [primaryCoinX, ...restCoinXs] = coins;
    if (restCoinXs.length > 0) {
      tx.mergeCoins(
        tx.object(primaryCoinX.coinObjectId),
        restCoinXs.map((coin) => tx.object(coin.coinObjectId))
      );
    }
    let coinIn;
    if (!isSendAll) {
      const [splitCoinIn] = tx.splitCoins(tx.object(primaryCoinX.coinObjectId), [
        tx.pure(finalAmount),
      ]);
      coinIn = splitCoinIn;
    } else {
      coinIn = tx.object(primaryCoinX.coinObjectId);
    }
    tx.transferObjects([coinIn], tx.pure(receiverAddress, "address"));
  }

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
};

export const mergeCoin = async (
  coinType,
  sender = { address: "", privateKey: "", keyPair: null },
  minCoinToMerge = MIN_COIN_TO_MERGE
) => {
  if (coinType == SUI_COINTYPE) {
    return;
  }
  const suiCoins = await getAllCoin(sender.address);
  const tx = new TransactionBlock();

  const gasPrice = await getReferenceGasPrice();
  const gasBudget = gasPrice * 10_000n;
  tx.setGasBudget(gasBudget);
  tx.setGasPrice(gasPrice);
  tx.setGasPayment(
    suiCoins.map((coin) => ({
      version: coin.version,
      digest: coin.digest,
      objectId: coin.coinObjectId,
    }))
  );

  const coins = await getAllCoinType(sender.address, coinType);
  if (!coins) {
    console.log("[ERR] no coin found");
    return null;
  }
  let [primaryCoinX, ...restCoinXs] = coins;
  if (!primaryCoinX) {
    console.log(`Coin is not available to merge for address ${sender.address}`);
    return;
  }
  if (restCoinXs.length >= minCoinToMerge) {
    if (restCoinXs.length > 500) {
      restCoinXs = restCoinXs.splice(0, 499);
    }
    console.log(
      `Merging ${restCoinXs.length + 1} objects for address ${sender.address}`
    );
    tx.mergeCoins(
      tx.object(primaryCoinX.coinObjectId),
      restCoinXs.map((coin) => tx.object(coin.coinObjectId))
    );
  } else {
    return;
  }

  let rs = await suiClient.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: sender.keyPair(),
    requestType: "WaitForLocalExecution",
    options: {
      showBalanceChanges: true,
      showEffects: true,
    },
  });
  if (coins.length - restCoinXs.length > minCoinToMerge) return await mergeCoin(coinType, sender, minCoinToMerge);
  return rs;
};

export const mergeOcean = async (sender = { address: "", privateKey: "" }) =>
  await mergeCoin(OCEAN_COINTYPE, sender);

export const sendSui = async (
  sender = { address: "", privateKey: "" },
  receiverAddress,
  amount
) => {
  return await sendCoin(SUI_COINTYPE, sender, receiverAddress, amount);
};

export const sendOcean = async (
  sender = { address: "", privateKey: "" },
  receiverAddress,
  amount,
  isSendAll = false
) => {
  return await sendCoin(OCEAN_COINTYPE, sender, receiverAddress, amount, isSendAll);
};
export const getAccountLevelAndMultipleKey = (address) => `sui.getAccountLevelAndMultiple.v2.${address}`
export const getAccountLevelAndMultiple = async (address, allowCache = false) => {
  let response = getItemObj(getAccountLevelAndMultipleKey(address));
  if (response && allowCache) return response;
  const result = await suiClient.getDynamicFieldObject({
    parentId: GAME_SHARE_OBJECT_ID,
    name: {
      type: "address",
      value: address,
    },
  });
  if (result?.error?.code == "dynamicFieldNotFound") {
    return { level: 1, multiple: 1, boat: 1, exist: false, lastClaim: null, referral: null };
  }
  if (result?.error) {
    throw new Error(result?.error?.code);
  }
  const { boat, mesh, seafood, last_claim, referral } = result.data.content.fields;
  const lastClaim = last_claim ? parseInt(last_claim) : null;
  response = { level: mesh + 1, multiple: seafood + 1, boat: boat + 1, exist: true, lastClaim, referral };
  const claimHour = _getAccountClaimHour(response.boat);
  const cacheTime = lastClaim ? new Date(lastClaim + claimHour * 60 * 60_000) - new Date() : 2 * 60 * 60_000;
  if (cacheTime > 0) {
    setItem(getAccountLevelAndMultipleKey(address), response, cacheTime);
  }
  return response;
};

export const getAccountGameObjectId = async (
  address,
  cursor,
  state = { accountGameObjectId: null, initialShareObjectVersion: null }
) => {
  const txs = await suiClient.queryTransactionBlocks({
    limit: 50,
    filter: {
      ToAddress: address,
    },
    cursor,
    options: {
      showEvents: true,
      showObjectChanges: true,
    },
  });
  const firstGameTxs = txs.data.filter((block) => {
    return block.events?.find?.(
      (event) =>
        event.type == EVENT_TYPE_CREATE_USER &&
        event.transactionModule == "game"
    );
  });
  if (firstGameTxs.length > 0) {
    const firstGameTx = firstGameTxs[firstGameTxs.length - 1];
    const accountGameObjects = firstGameTx.objectChanges.filter(
      (object) =>
        object.type == "created" &&
        object.owner.AddressOwner == address &&
        object.objectType == GAME_FIRST_TX_OBJECT_TYPE
    );
    if (accountGameObjects.length > 0) {
      state.accountGameObjectId = accountGameObjects[0].objectId;
    }
    const gameShareObject = firstGameTx.objectChanges?.find?.(
      (object) => object.objectId == GAME_SHARE_OBJECT_ID
    );
    if (gameShareObject) {
      state.initialShareObjectVersion =
        gameShareObject.owner.Shared.initial_shared_version;
    }
  }
  if (txs.hasNextPage && cursor != txs.nextCursor)
    return await getAccountGameObjectId(address, txs.nextCursor, state);
  return state;
};

export const getTotalOceanToUpgrade = (type, level, maxLv) => {
  if (level > maxLv) return 0
  return getAmountToUpgrade(type, level) + getTotalOceanToUpgrade(type, level + 1, maxLv)
}

export const getAmountToUpgrade = (type, nextLv) => {
  if (type == "mesh") {
    switch (nextLv) {
      case 2:
        return 20;
      case 3:
        return 100;
      case 4:
        return 200;
      case 5:
        return 400;
      case 6:
        return 2000;
    }
  } else if (type == "boat") {
    switch (nextLv) {
      case 2:
        return 20;
      case 3:
        return 40;
      case 4:
        return 60;
      case 5:
        return 100;
      case 6:
        return 160;
    }
  }
  return 0;
};

export const upgradeMesh = async (
  sender = { address: "", privateKey: "" },
  requireAmount
) => {
  return await upgradeOceanAccount(sender, "upgrade_mesh", requireAmount);
};

export const upgradeBoat = async (
  sender = { address: "", privateKey: "" },
  requireAmount
) => {
  return await upgradeOceanAccount(sender, "upgrade_boat", requireAmount);
};

export const upgradeOceanAccount = async (
  sender = { address: "", privateKey: "" },
  type,
  requireAmount
) => {
  await mergeCoin(OCEAN_COINTYPE, sender, 1);
  const suiCoins = await getAllCoin(sender.address);
  const tx = new TransactionBlock();
  const gasPrice = await getReferenceGasPrice();
  const gasBudget = gasPrice * 10_000n;
  tx.setGasBudget(gasBudget);
  tx.setGasPrice(gasPrice);
  tx.setGasPayment(
    suiCoins.map((coin) => ({
      version: coin.version,
      digest: coin.digest,
      objectId: coin.coinObjectId,
    }))
  );
  const coins = await getAllCoinType(sender.address, OCEAN_COINTYPE);
  if (!coins) {
    console.log("[ERR] no coin found");
    return null;
  }

  const coinIns = tx.splitCoins(tx.object(coins[0]?.coinObjectId), [
    tx.pure(requireAmount * 1_000_000_000),
  ]);
  let args = [tx.object(GAME_SHARE_OBJECT_ID), coinIns];

  tx.moveCall({
    target: `0x2c68443db9e8c813b194010c11040a3ce59f47e4eb97a2ec805371505dad7459::game::${type}`,
    arguments: args,
  });
  // [tx.object(accountGameObjectId), tx.object(primaryCoinX.objectId)]

  let rs = await suiClient.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: sender.keyPair(),
    requestType: "WaitForLocalExecution",
    options: {
      showBalanceChanges: true,
      showEffects: true,
    },
  });
  removeItem(getAccountLevelAndMultipleKey(sender.address));
  return rs;
};

export const updateRef = async (
  sender = { address: "", privateKey: "" },
  refAddress
) => {
  const suiCoins = await getAllCoin(sender.address);
  const tx = new TransactionBlock();
  const gasPrice = await getReferenceGasPrice();
  const gasBudget = gasPrice * 10_000n;
  tx.setGasBudget(gasBudget);
  tx.setGasPrice(gasPrice);
  tx.setGasPayment(
    suiCoins.map((coin) => ({
      version: coin.version,
      digest: coin.digest,
      objectId: coin.coinObjectId,
    }))
  );

  tx.moveCall({
    target: `0x2c68443db9e8c813b194010c11040a3ce59f47e4eb97a2ec805371505dad7459::game::update_ref`,
    arguments: [tx.object(GAME_SHARE_OBJECT_ID), tx.pure(refAddress, "address")],
  });

  let rs = await suiClient.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: sender.keyPair(),
    requestType: "WaitForLocalExecution",
    options: {
      showBalanceChanges: true,
      showEffects: true,
    },
  });
  removeItem(getAccountLevelAndMultipleKey(sender.address));
  return rs;
};

export const claimRefMission = async (
  sender = { address: "", privateKey: "" },
  signature
) => {
  const suiCoins = await getAllCoin(sender.address);
  const tx = new TransactionBlock();
  const gasPrice = await getReferenceGasPrice();
  const gasBudget = gasPrice * 10_000n;
  tx.setGasBudget(gasBudget);
  tx.setGasPrice(gasPrice);
  tx.setGasPayment(
    suiCoins.map((coin) => ({
      version: coin.version,
      digest: coin.digest,
      objectId: coin.coinObjectId,
    }))
  );

  const inputSignature = [].slice.call(Buffer.from(signature, "base64"))
  tx.moveCall({
    target: `0x83a2773c4cd2c2cb6a96ff9b9e97fc55e1a5d8ce3fa7622291d9f08b6217244d::box::claim_mission`,
    arguments: [
      tx.object("0x37e0c56517e48039584c43cccc11fe91157eb9274c3c8bfbcabae7853409a256"),
      tx.object(GAME_SHARE_OBJECT_ID),
      tx.pure(1), // mission id
      tx.pure(inputSignature),
    ],
  });

  let rs = await suiClient.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: sender.keyPair(),
    requestType: "WaitForLocalExecution",
    options: {
      showBalanceChanges: true,
      showEffects: true,
    },
  });
  removeItem(getAccountLevelAndMultipleKey(sender.address));
  return rs;
};

export const claimReward = async (sender = { address: "", privateKey: "" }) => {
  const suiCoins = await getAllCoin(sender.address);

  const tx = new TransactionBlock();
  const gasPrice = await getReferenceGasPrice();
  const gasBudget = gasPrice * 10_000n;
  tx.setGasBudget(gasBudget);
  tx.setGasPrice(gasPrice);
  tx.setGasPayment(
    suiCoins.map((coin) => ({
      version: coin.version,
      digest: coin.digest,
      objectId: coin.coinObjectId,
    }))
  );

  tx.moveCall({
    target:
      "0x2c68443db9e8c813b194010c11040a3ce59f47e4eb97a2ec805371505dad7459::game::claim",
    arguments: [
      tx.object(GAME_SHARE_OBJECT_ID),
      tx.object(CLOCK_SHARE_OBJECT_ID),
    ],
  });

  let rs = await suiClient.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: sender.keyPair(),
    requestType: "WaitForLocalExecution",
    options: {
      showBalanceChanges: true,
      showEffects: true,
    },
  });
  removeItem(getAccountLevelAndMultipleKey(sender.address));
  return rs;
};

export const getLatestClaimTx = async (address) => {
  const { lastClaim } = await getAccountLevelAndMultiple(address);
  return lastClaim ? new Date(lastClaim) : null;
};

export const isQualifiedToSendGas = async (address, ignoreFirstCreateDate = false, firstAirdrop = false) => {
  const { level, boat, exist } = await getAccountLevelAndMultiple(address);
  if (!exist) return false;
  let minMeshLevel = 2, minBoatLevel = 2
  if (firstAirdrop) {
    minMeshLevel = 1;
    minBoatLevel = 1;
  }
  if (level >= minMeshLevel || boat >= minBoatLevel) return true;
  if (ignoreFirstCreateDate) return false;
  const firstCreateDate = await getFirstCreateDate(address);
  return firstCreateDate != null
}

export const getFirstCreateDate = async (address, cursor) => {
  const tx = await suiClient.queryTransactionBlocks({
    limit: 50,
    cursor,
    filter: {
      ToAddress: address,
    },
    options: {
      showEvents: true,
    },
  });
  const firstGameTxs = tx.data.filter((block) => {
    return block.events?.find?.(
      (event) =>
        event.type == EVENT_TYPE_CREATE_USER &&
        event.transactionModule == "game"
    );
  });
  if (firstGameTxs.length > 0) {
    return new Date(parseInt(firstGameTxs[0].timestampMs));
  }
  if (tx.hasNextPage && cursor != tx.nextCursor)
    return await getFirstCreateDate(address, tx.nextCursor);
  return null;
};

export const isClaimTx = (block, ownerAddress) =>
  block.effects?.status?.status == "success" &&
  block.events?.find?.(
    (event) =>
      event.sender == ownerAddress &&
      event.type ==
      "0x1efaf509c9b7e986ee724596f526a22b474b15c376136772c00b8452f204d2d1::game::ClaimToken"
  );

export const getAccountClaimHour = async (address) => {
  const { boat } = await getAccountLevelAndMultiple(address);
  return _getAccountClaimHour(boat);
};

export const _getAccountClaimHour = (boat) => {
  switch (boat) {
    case 2:
      return 3;
    case 3:
      return 4;
    case 4:
      return 6;
    case 5:
      return 12;
    case 6:
      return 24;
    default:
      return 2;
  }
};
