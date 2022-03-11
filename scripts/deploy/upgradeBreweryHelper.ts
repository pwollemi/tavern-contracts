import { ethers, upgrades } from "hardhat";
import { BreweryHelper_address, RenovationHelper_address, renovation_address } from "../NFT_ADDRESSES";

async function main() {
  const factory = await ethers.getContractFactory("BreweryPurchaseHelper");
  await upgrades.upgradeProxy(BreweryHelper_address, factory);
  console.log("Upgraded brewery purchase helper!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
