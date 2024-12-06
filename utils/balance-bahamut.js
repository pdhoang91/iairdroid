import { dzookContract } from "../config/dzook-abi.js";
import { bahamutClient } from "../config/network.js";
import Web3 from "web3";
import { vivaContract } from "../config/viva-abi.js";

export const getDzook = async (address) => {
  let amount = await dzookContract.methods.balanceOf(address).call();
  return parseFloat(Web3.utils.fromWei(amount, "ether"));
};

export const getViva = async (address) => {
  let amount = await vivaContract.methods.balanceOf(address).call();
  return parseFloat(Web3.utils.fromWei(amount, "ether"));
};

export const getFtn = async (address) => {
  const amount = await bahamutClient.eth.getBalance(address);
  return parseFloat(Web3.utils.fromWei(amount, "ether"));
};

export const sendDzook = async (signer, receiverAddress, amount) => {
  const amountInHex = Web3.utils.toWei(amount, "ether");
  return await dzookContract.methods
    .transfer(receiverAddress, amountInHex)
    .send({
      from: signer.address,
      gas: 100_000,
    });
};

export const sendViva = async (signer, receiverAddress, amount) => {
  const amountInHex = Web3.utils.toWei(amount, "ether");
  return await vivaContract.methods
    .transfer(receiverAddress, amountInHex)
    .send({
      from: signer.address,
      gas: 100_000,
    });
};

export const sendFtn = async (signer, receiverAddress, amount) => {
  const amountInHex = Web3.utils.toWei(amount, "ether");
  return await bahamutClient.eth.sendTransaction({
    from: signer.address,
    to: receiverAddress,
    data: "0x",
    value: amountInHex,
    gas: 50_000,
  });
};
