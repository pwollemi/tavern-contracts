import { ethers } from "hardhat";
import { TreasuryAddress, USDC_MAINNET } from "../ADDRESSES";
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


    let tx = await BreweryHelper.setConversionDiscount(1000);
    await tx.wait();

    tx = await BreweryHelper.setConversionPeriodRequirement(86400 * 3);
    await tx.wait();

    // const lpDiscount = await BreweryHelper.calculateLPDiscount();
    // const precision = await settings.PRECISION();
    // const zapFee = await BreweryHelper.zapFee();
    // const discountMultiplier = precision.sub(lpDiscount).div(precision);
    // const zapFeeMultiplier = precision.add(zapFee).div(precision);
    // const breweryPrice = await BreweryHelper.getUSDCForMead(await settings.breweryCost());
    // const discount = breweryPrice.mul(lpDiscount).div(1e4);
    // const discountWithZap = breweryPrice.mul(lpDiscount.sub(zapFee)).div(1e4);;
    // console.log("Zap Multiplier", ethers.utils.formatUnits(zapFeeMultiplier, 2));
    // console.log("Brewery Price", ethers.utils.formatUnits(breweryPrice, 6));
    // console.log("Brewery Price w/ LP discount", ethers.utils.formatUnits(breweryPrice.sub(discount), 6));
    // console.log("Brewery Price w/ LP discount + zap", ethers.utils.formatUnits(breweryPrice.sub(discountWithZap), 6));
    // console.log("\n-- Before --")
    // console.log("USDC Balance Before", ethers.utils.formatUnits(await usdc.balanceOf(deployer.address), 6));
    // console.log("LP Balance Before", ethers.utils.formatUnits(await lp.balanceOf(TreasuryAddress), 18));
    // console.log("Brewery Balance Before", await brewery.balanceOf(deployer.address));

    // console.log("-- Zapping ... --")
    // await usdc.approve(BreweryHelper.address, ethers.constants.MaxUint256);
    // await lp.approve(BreweryHelper.address, ethers.constants.MaxUint256);
    // await BreweryHelper.purchaseWithLPUsingZap("");
    
    // console.log("-- After --")
    // console.log("USDC Balance After", ethers.utils.formatUnits(await usdc.balanceOf(deployer.address), 6));
    // console.log("LP Balance After", ethers.utils.formatUnits(await lp.balanceOf(TreasuryAddress), 18));
    // console.log("Brewery Balance After", await brewery.balanceOf(deployer.address));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
