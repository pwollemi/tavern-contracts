import { ethers, upgrades } from "hardhat";
import { MARKETPLACE_ADDRESS } from "../ADDRESSES";
import { BreweryHelper_address, ClassManager_address, RenovationHelper_address, renovation_address } from "../NFT_ADDRESSES";

async function main() {
  const factory = await ethers.getContractFactory("TavernEscrowTrader");
  await upgrades.upgradeProxy(MARKETPLACE_ADDRESS, factory);
  console.log("Upgraded marketplace!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
