import { ethers } from "hardhat";
import { settings_address } from "../NFT_ADDRESSES";

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
    console.log("\tRedeem Pool", await settings.redeemPool());
    console.log("\tXMead Redeemer", await settings.redeemer());
    console.log("\tRenovation Address", await settings.renovationAddress());
    console.log("\tClass Manager", await settings.classManager());
    console.log("\tTrader Joe Router", await settings.dexRouter());
    console.log("\tLiquidity Pair", await settings.liquidityPair());

    console.log("\n\n=== Settings ===")
    console.log("\ttreasuryFee", await settings.treasuryFee());
    console.log("\trewardPoolFee", await settings.rewardPoolFee());
    console.log("\ttxLimit", await settings.txLimit());
    console.log("\twalletLimit", await settings.walletLimit());
    console.log("\tbreweryCost", await settings.breweryCost());
    console.log("\txMeadCost", await settings.xMeadCost());
    console.log("\tTaxes 1", await settings.classTaxes(0))
    console.log("\tTaxes 2", await settings.classTaxes(1))
    console.log("\tTaxes 3", await settings.classTaxes(2))
    console.log("\tTaxes 4", await settings.classTaxes(3))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
