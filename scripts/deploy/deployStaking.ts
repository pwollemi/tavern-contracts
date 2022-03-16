import hre, { ethers } from "hardhat";
import { deployContract } from "../../helper/deployer";

async function main() {

  // Deploy xMEAD
  const staking = await deployContract("TavernStaking");
  console.log("staking address", staking.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
