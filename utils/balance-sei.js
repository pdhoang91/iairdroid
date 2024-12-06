import {
  SPELL_FARMING_CONTRACT_ADDRESS,
  SPELL_FARMING_V2_CONTRACT_ADDRESS,
  seiClient,
} from "../config/network.js";

export const getMana = async (address) => {
  const result = await (await seiClient()).queryContractSmart(SPELL_FARMING_V2_CONTRACT_ADDRESS, {
    balance: {
      address,
    },
  });
  return result.balance / 1_000_000;
};

export const claimMana = async (sender) => {
  const signer = await sender.getSigner();
  const client = await sender.getClient();

  const [account] = await signer.getAccounts();

  return await client.execute(
    account.address,
    SPELL_FARMING_CONTRACT_ADDRESS,
    {
      claim: {
        address: account.address,
      },
    },
    "auto",
    undefined,
    []
  );
};
