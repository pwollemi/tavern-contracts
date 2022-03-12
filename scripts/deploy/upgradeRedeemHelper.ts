import { ethers, upgrades } from "hardhat";
import { RedeemHelper_address, RenovationHelper_address, renovation_address } from "../NFT_ADDRESSES";

async function main() {
  const factory = await ethers.getContractFactory("xMeadRedeemHelper");
  await upgrades.upgradeProxy(RedeemHelper_address, factory);
  console.log("Upgraded redeem helper!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
