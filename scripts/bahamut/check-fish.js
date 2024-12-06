import { claimFish, getUser, login } from "../../utils/fish.js";
import { getAllFishAddress, getFishAddress } from "../../utils/wallet.js";

const main = async () => {
  const secret = await getFishAddress(0);
  // console.log(secret)
  const user = await login(secret)
  console.log(user.balance);
  console.log(secret.privateKey)
  const res = await claimFish(secret)
  // console.log(res)
  console.log((await getUser(secret)).balance);
};

main();
