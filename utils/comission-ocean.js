import { OCEAN_COINTYPE, suiClient } from "../config/network.js";
import { isClaimTx } from "./balance-ocean.js";

export const calculateComission = async (
  ownerAddress,
  creditorAddress,
  commission = 0.2,
  startTime
) => {
  const { allClaimTxs, allPayTxs } = await getAllClaimAndPayTxsFromTime(
    ownerAddress,
    creditorAddress,
    startTime
  );
  const { allRefunedTxs } = await getAllRefundedTxsFromTime(
    ownerAddress,
    creditorAddress,
    startTime
  );
  const totalClaim = allClaimTxs
    .map((block) =>
      block.balanceChanges
        .filter(
          (balance) =>
            balance.owner.AddressOwner == ownerAddress &&
            balance.coinType == OCEAN_COINTYPE
        )
        .map((balance) => balance.amount)
    )
    .flat()
    .reduce((total, val) => total + val / 1_000_000_000, 0);

  const totalRefunded = allRefunedTxs
    .map((block) =>
      block.balanceChanges
        .filter(
          (balance) =>
            balance.owner.AddressOwner == ownerAddress &&
            balance.coinType == OCEAN_COINTYPE
        )
        .map((balance) => balance.amount)
    )
    .flat()
    .reduce((total, val) => total + val / 1_000_000_000, 0);
  const totalPay =
    allPayTxs
      .map((block) =>
        block.balanceChanges
          .filter(
            (balance) =>
              balance.owner.AddressOwner == creditorAddress &&
              balance.coinType == OCEAN_COINTYPE
          )
          .map((balance) => balance.amount)
      )
      .flat()
      .reduce((total, val) => total + val / 1_000_000_000, 0) - totalRefunded;
  const totalBillAmount = totalClaim * commission;
  let debt = totalBillAmount - totalPay;
  let lastPayDate;
  if (allPayTxs.length > 0) {
    lastPayDate = new Date(parseInt(allPayTxs[0].timestampMs));
  }
  return {
    totalClaim,
    totalPay,
    totalBillAmount,
    debt,
    totalClaimTx: allClaimTxs.length,
    totalPayTx: allPayTxs.length,
    lastPayDate,
  };
};

export const getAllClaimAndPayTxsFromTime = async (
  ownerAddress,
  creditorAddress,
  fromTime,
  nextCursor,
  state = {
    allClaimTxs: [],
    allPayTxs: [],
  }
) => {
  const tx = await suiClient.queryTransactionBlocks({
    limit: 50,
    cursor: nextCursor,
    filter: {
      FromAddress: ownerAddress,
    },
    options: {
      showBalanceChanges: true,
      showEvents: true,
      showEffects: true,
    },
  });
  const claimTxs = tx.data.filter((block) => {
    return new Date(parseInt(block.timestampMs)) >= fromTime && isClaimTx(block, ownerAddress);
  });

  const payTxs = tx.data.filter(
    (block) =>
      new Date(parseInt(block.timestampMs)) >= fromTime &&
      isPayTx(block, ownerAddress, creditorAddress)
  );
  state.allClaimTxs = [...state.allClaimTxs, ...claimTxs];
  state.allPayTxs = [...state.allPayTxs, ...payTxs];
  if (tx.data.find((block) => new Date(parseInt(block.timestampMs)) < fromTime)) return state;
  if (tx.hasNextPage && nextCursor != tx.nextCursor)
    return await getAllClaimAndPayTxsFromTime(
      ownerAddress,
      creditorAddress,
      fromTime,
      tx.nextCursor,
      state
    );

  return state;
};

export const getAllRefundedTxsFromTime = async (
  ownerAddress,
  creditorAddress,
  fromTime,
  nextCursor,
  state = {
    allRefunedTxs: [],
  }
) => {
  const tx = await suiClient.queryTransactionBlocks({
    limit: 50,
    cursor: nextCursor,
    filter: {
      ToAddress: ownerAddress,
    },
    options: {
      showBalanceChanges: true,
      showEvents: true,
      showEffects: true,
    },
  });

  const refundedTxs = tx.data.filter(
    (block) =>
      new Date(parseInt(block.timestampMs)) >= fromTime &&
      isRefundedTx(block, ownerAddress, creditorAddress)
  );

  state.allRefunedTxs = [...state.allRefunedTxs, ...refundedTxs];
  if (tx.data.find((block) => new Date(parseInt(block.timestampMs)) < fromTime)) return state;
  if (tx.hasNextPage && nextCursor != tx.nextCursor)
    return await getAllRefundedTxsFromTime(
      ownerAddress,
      creditorAddress,
      fromTime,
      tx.nextCursor,
      state
    );

  return state;
};

export const isPayTx = (block, ownerAddress, creditorAddress) => {
  const ownerBalanceChange = block.balanceChanges.find(
    (balance) =>
      balance.coinType == OCEAN_COINTYPE &&
      balance.owner.AddressOwner == ownerAddress
  );
  const creditorBalanceChange = block.balanceChanges.find(
    (balance) =>
      balance.coinType == OCEAN_COINTYPE &&
      balance.owner.AddressOwner == creditorAddress
  );
  return (
    block.effects.status.status == "success" &&
    block.balanceChanges.length == 3 &&
    ownerBalanceChange &&
    creditorBalanceChange &&
    ownerBalanceChange.amount < 0 &&
    Math.abs(ownerBalanceChange.amount) == creditorBalanceChange.amount
  );
};

export const isRefundedTx = (block, ownerAddress, creditorAddress) => {
  const ownerBalanceChange = block.balanceChanges.find(
    (balance) =>
      balance.coinType == OCEAN_COINTYPE &&
      balance.owner.AddressOwner == ownerAddress
  );
  const creditorBalanceChange = block.balanceChanges.find(
    (balance) =>
      balance.coinType == OCEAN_COINTYPE &&
      balance.owner.AddressOwner == creditorAddress
  );
  return (
    block.effects.status.status == "success" &&
    block.balanceChanges.length == 3 &&
    ownerBalanceChange &&
    creditorBalanceChange &&
    creditorBalanceChange.amount < 0 &&
    ownerBalanceChange.amount == Math.abs(creditorBalanceChange.amount)
  );
};
