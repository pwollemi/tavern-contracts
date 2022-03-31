import { ethers, upgrades } from "hardhat";
import { BreweryHelper_address, ClassManager_address, RenovationHelper_address, renovation_address } from "../NFT_ADDRESSES";

async function main() {
  const factory = await ethers.getContractFactory("ClassManager");
  await upgrades.upgradeProxy(ClassManager_address, factory);
  console.log("Upgraded class manager!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
