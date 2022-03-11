import { ethers, upgrades } from "hardhat";
import { RenovationHelper_address, renovation_address } from "../NFT_ADDRESSES";

async function main() {
  const factory = await ethers.getContractFactory("RenovationPurchaseHelper");
  await upgrades.upgradeProxy(RenovationHelper_address, factory);
  console.log("Upgraded renovation purchase helper!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
