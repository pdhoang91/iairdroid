import { generateTonSeedphases } from "../../utils/wallet.js";

const main = async () => {
  const seedphases = await generateTonSeedphases(300);
  seedphases.forEach((seedphase, i) => console.log(seedphase.join(" ")));
};

main();
