import { ethers } from "hardhat";
import { settings_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, rewardsPool, redeemPool] = await ethers.getSigners();
    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    //await settings.setRewardsPool(rewardsPool.address);
    // await settings.setRedeemPool(redeemPool.address);
    await settings.setBreweryCost(ethers.utils.parseUnits("110", 18));
    //await settings.setRedeemer('0x2f54fc9EF1B3a0259cC8DC5B1047edC2670F460E');

    // await settings.setReputationForMead(10);
    // await settings.setReputationForUSDC(20);
    // await settings.setReputationForLP(30);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
