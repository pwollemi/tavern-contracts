

import { ethers, upgrades } from "hardhat";
import { USDC_MAINNET } from "./ADDRESSES";
import { Brewery_address, Mead_address, RedeemHelper_address, settings_address } from "./NFT_ADDRESSES";

import ERC20 from "../abis/ERC20.json"

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    let tx;

    console.log("Deployer Address", deployer.address);
    console.log("AVAX", ethers.utils.formatEther(await deployer.getBalance()));
    const mead = await ethers.getContractAt("Mead", Mead_address);
    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    const router = await ethers.getContractAt("IJoeRouter02", await settings.dexRouter());
    const factory = await ethers.getContractAt("IJoeFactory", await router.factory());
    const redeemer = await ethers.getContractAt("xMeadRedeemHelper", RedeemHelper_address)
    const usdc = await ethers.getContractAt(ERC20, USDC_MAINNET)

    // Check balances
    const meadBalance = await mead.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("Mead Balance", ethers.utils.formatUnits(meadBalance, 18));
    console.log("USDC Balance", ethers.utils.formatUnits(usdcBalance, 6));

    tx = await mead.enableTrading({ nonce: 299 });
    await tx.wait();
    console.log("Trading enabled");

    // Set start time for BREWERY rewards to now
    tx = await brewery.setStartTime(Math.round(Date.now()/1000));
    await tx.wait();
    console.log("BREWERYs Reward Start Time set");

    // Set enable for redeemer 
    tx = await redeemer.enable(true);
    await tx.wait();
    console.log("Enabled redeems on the xMEAD redeem page");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
