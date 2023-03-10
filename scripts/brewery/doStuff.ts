import { ethers } from "hardhat";
import { MARKETPLACE_ADDRESS, TreasuryAddress, USDC_MAINNET } from "../ADDRESSES";
import ERC20 from '../../abis/ERC20.json';
import { BreweryHelper_address, Brewery_address, ClassManager_address, Mead_address, RedeemHelper_address, settings_address } from "../NFT_ADDRESSES";
import { text } from "stream/consumers";

async function main() {
    // The signers
    const [deployer, alice, bob] = await ethers.getSigners();

    console.log("Deployer Address", deployer.address);
    console.log("AVAX", ethers.utils.formatEther(await deployer.getBalance()));
    const mead = await ethers.getContractAt("Mead", Mead_address);
    const usdc = await ethers.getContractAt(ERC20, USDC_MAINNET)
    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    const lp = await ethers.getContractAt("IJoePair", await settings.liquidityPair())
    const router = await ethers.getContractAt("IJoeRouter02", await settings.dexRouter());
    const factory = await ethers.getContractAt("IJoeFactory", await router.factory());
    const redeemer = await ethers.getContractAt("xMeadRedeemHelper", RedeemHelper_address)
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address)
    const BreweryHelper = await ethers.getContractAt("BreweryPurchaseHelper", '0xA3d66fa0140260217F7781793CcDE3b030B58258');

    //await brewery.setBreweryTier(16175, 2);
    //await brewery.setBreweryXp(16175, 4000000);

    let tx = await brewery.setMaxBreweries(16673)
    await tx.wait();
    tx = await brewery.mint("0x6e518B9EC4B35Da022C885a305b524b8B53e3373", "");
    await tx.wait();
    await brewery.setBreweryTier(16673, 2);
    //await brewery.resetGlobalLastClaimed(deployer.address);
    //await brewery.setBreweryLastClaimed(8157, 0)
    //await brewery.setGlobalLastClaimed(deployer.address, 0)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
