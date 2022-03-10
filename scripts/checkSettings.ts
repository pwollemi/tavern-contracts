import { ethers } from "hardhat";
import { settings_address } from "./NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();
    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    console.log("=== Addresses ===")
    console.log("\tMead", await settings.mead());
    console.log("\txMead", await settings.xmead());
    console.log("\tUSDC", await settings.usdc());
    console.log("\tTreasury", await settings.tavernsKeep());
    console.log("\tReward Pool", await settings.rewardsPool());
    console.log("\tredeemer", await settings.redeemer());
    console.log("\trenovationAddress", await settings.renovationAddress());
    console.log("\tclassManager", await settings.classManager());
    console.log("\tdexRouter", await settings.dexRouter());
    console.log("\tliquidityPair", await settings.liquidityPair());

    console.log("\n\n=== Settings ===")
    console.log("\ttreasuryFee", await settings.treasuryFee());
    console.log("\trewardPoolFee", await settings.rewardPoolFee());
    console.log("\ttxLimit", await settings.txLimit());
    console.log("\twalletLimit", await settings.walletLimit());
    console.log("\tbreweryCost", await settings.breweryCost());
    console.log("\txMeadCost", await settings.xMeadCost());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
