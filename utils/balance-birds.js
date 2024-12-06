import { TransactionBlock } from "@mysten/sui.js/transactions";
import { getItemObj, setItem, suiClient } from "../config/network.js";
import { getAllCoin, getReferenceGasPrice } from "./balance-ocean.js";
import { bcs } from "@mysten/sui.js/bcs";

const BIRD_STORE_ID = "0x2d942791de55513d1cae2529acd14b64624919c1ee32dcf3d187c0dcd0c2c04f"
const CLOCK_ID = "0x06"
const BIRD_VERSION_ID = "0x41ee63984e12557a40329acdc6f77eaea2e59ccc19d9f5a4e8fdd1582f45d2ef"
const BIRD_REG_ID = "0xbb3027323ed2192c41ca849c61a24cb328222ba332a036cdf82f1d2cc2ebe15e"
const PACKAGE_ID_2 = "0x59f4fd9b3928b8358ce60335d15b6b6848f094d0deb64238b0535a99e4e13e4a"
const BIRD_STORE_ID_2 = "0xf0c180e15b51e8b61fa6b0d1c862d4f2daaa5001ea6c04b8972778a9c499131d"
const BIRD_VERSION_ID_2 = "0xe22dc39f6a210c0d805e6e97b30bd114b3c7e9c604252022d194d6bb65c012ef"
const BIRD_REG_ID_2 = "0x6bca295fb6cc0c7b9cf194f4aa84d7e611643f49a7c9bfd6d996f220b952107f"
const PACKAGE_ID_2_2 = "0x72962f3a746a10a08234d1db3b495b3fc137760998573413ae9e742618c241ab"
export const getUserArchive = async (address) => {
    const result = await suiClient.getOwnedObjects({
        owner: address,
        filter: {
            MatchAll: [
                { StructType: "0x64254dd3675459aae82e063ed6276f99fe23616f75fdb0b683f5d2c6024a0bd7::bird::BirdArchieve" },
                { AddressOwner: address }
            ],
        },
        options: {
            showType: true,
            showPreviousTransaction: true,
            showOwner: true
        },
    });
    return result.data[0]?.data;
};

export const createUserArchive = async (
    sender = { address: "", privateKey: "" },
) => {
    const suiCoins = await getAllCoin(sender.address);
    const tx = new TransactionBlock();
    const gasPrice = await getReferenceGasPrice();
    const gasBudget = gasPrice * 10_000n;
    tx.setSender(sender.address);
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
        target: `0x64254dd3675459aae82e063ed6276f99fe23616f75fdb0b683f5d2c6024a0bd7::bird_entries::register`,
        arguments: [tx.object(BIRD_REG_ID), tx.object(CLOCK_ID), tx.object(BIRD_VERSION_ID)],
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
    return rs;
};

export const checkinBirdKey = (address, date) => `sui.birds.checkin.${address}-${date}`;
export const checkinBird = async (
    sender = { address: "", privateKey: "" },
    message,
    signature,
    date,
) => {
    const txHash = getItemObj(checkinBirdKey(sender.address, date));
    if (txHash) return txHash;
    const userArchive = await getUserArchive(sender.address);
    if (!userArchive) {
        sender.log(`Register user onchain for address ${sender.address}`);
        const response = await createUserArchive(sender);
        if (response.effects.status.status != "success") {
            throw new Error(
                response?.effects?.status?.error ||
                `Sending fail, response: ${JSON.stringify(response)}`
            );
        }
        sender.log("Register user onchain success");
        return await checkinBird(sender, message, signature);
    }
    const suiCoins = await getAllCoin(sender.address);
    const tx = new TransactionBlock();
    const gasPrice = await getReferenceGasPrice();
    const gasBudget = gasPrice * 10_000n;
    tx.setSender(sender.address);
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
        target: `0x64254dd3675459aae82e063ed6276f99fe23616f75fdb0b683f5d2c6024a0bd7::bird_entries::mineBird`,
        arguments: [
            tx.pure(bcs.ser(["vector", "u8"], Buffer.from(signature, "hex")).toBytes()),
            tx.pure(bcs.ser(["vector", "u8"], Buffer.from(message, "hex")).toBytes()),
            tx.object(BIRD_STORE_ID),
            tx.object(userArchive.objectId),
            tx.object(CLOCK_ID), tx.object(BIRD_VERSION_ID)],
    });

    const txResponse = await suiClient.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: sender.keyPair(),
        requestType: "WaitForLocalExecution",
        options: {
            showBalanceChanges: true,
            showEffects: true,
        },
    });
    if (txResponse.effects.status.status != "success") {
        throw new Error(
            txResponse?.effects?.status?.error ||
            `Sending fail, response: ${JSON.stringify(txResponse)}`
        );
    }
    const newTxHash = txResponse.effects.transactionDigest;
    setItem(checkinBirdKey(sender.address, date), newTxHash, 6 * 30 * 24 * 60 * 60_000);
    return newTxHash
};

export const getUserArchive2 = async (address) => {
    const result = await suiClient.getOwnedObjects({
        owner: address,
        filter: {
            MatchAll: [
                { StructType: `${PACKAGE_ID_2}::bird::BirdArchieve` },
                { AddressOwner: address }
            ],
        },
        options: {
            showType: true,
            showPreviousTransaction: true,
            showOwner: true
        },
    });
    return result.data[0]?.data;
};

export const createUserArchive2 = async (
    sender = { address: "", privateKey: "" },
) => {
    const suiCoins = await getAllCoin(sender.address);
    const tx = new TransactionBlock();
    const gasPrice = await getReferenceGasPrice();
    const gasBudget = gasPrice * 10_000n;
    tx.setSender(sender.address);
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
        target: `${PACKAGE_ID_2}::bird_entries::register`,
        arguments: [tx.object(BIRD_REG_ID_2), tx.object(CLOCK_ID), tx.object(BIRD_VERSION_ID_2)],
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
    return rs;
};

export const mintWormKey = (id) => `sui.birds.mintWorm.${id}`;
export async function mintWormOnchain(
    sender,
    message,
    signature,
    wormId,
) {
    const txHash = getItemObj(mintWormKey(wormId));
    if (txHash) return txHash;
    const userArchive = await getUserArchive2(sender.address);
    if (!userArchive) {
        sender.log(`Register user onchain for minting worm for address ${sender.address}`);
        const response = await createUserArchive2(sender);
        if (response.effects.status.status != "success") {
            throw new Error(
                response?.effects?.status?.error ||
                `Sending fail, response: ${JSON.stringify(response)}`
            );
        }
        sender.log("Register user onchain for minting worm success");
        return await mintWormOnchain(sender, message, signature, wormId);
    }
    const suiCoins = await getAllCoin(sender.address);
    const tx = new TransactionBlock();
    const gasPrice = await getReferenceGasPrice();
    const gasBudget = gasPrice * 10_000n;
    tx.setSender(sender.address);
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
        target: `${PACKAGE_ID_2_2}::bird_entries::catchWorm`,
        arguments: [
            tx.pure(
                bcs.ser(["vector", "u8"], Buffer.from(signature, "hex")).toBytes()
            ),
            tx.pure(
                bcs.ser(["vector", "u8"], Buffer.from(message, "hex")).toBytes()
            ),
            tx.object(BIRD_STORE_ID_2),
            tx.object(userArchive.objectId),
            tx.object(CLOCK_ID),
            tx.object(BIRD_VERSION_ID_2),
        ],
        typeArguments: [],
    });
    const txResponse = await suiClient.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: sender.keyPair(),
        requestType: "WaitForLocalExecution",
        options: {
            showBalanceChanges: true,
            showEffects: true,
        },
    });
    if (txResponse.effects.status.status != "success") {
        throw new Error(
            txResponse?.effects?.status?.error ||
            `Sending fail, response: ${JSON.stringify(txResponse)}`
        );
    }
    const newTxHash = txResponse.effects.transactionDigest;
    setItem(mintWormKey(wormId), newTxHash, 6 * 30 * 24 * 60 * 60_000);
    return newTxHash;
}