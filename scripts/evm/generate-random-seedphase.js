import { generateEvmSeedphases } from "../../utils/wallet.js";

const main = async () => {
  const seedphases = await generateEvmSeedphases(300);
  seedphases.forEach((seedphase, i) => console.log(seedphase));
};

main();
