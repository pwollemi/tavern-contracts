import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { BreweryHelper_address, Brewery_address, Mead_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const holderAddress = '0xc198CAe628C26076Cf94D1bfDf67E021D908646D'
    await impersonateAccount(holderAddress);
    const signedHolder = await ethers.getSigner(holderAddress);

    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const xMead = await ethers.getContractAt("XMead", xMead_address);
    const mead = await ethers.getContractAt("Mead", Mead_address);
    const usdc = await ethers.getContractAt(ERC20, USDC_MAINNET);
    const BreweryHelper = await ethers.getContractAt("BreweryPurchaseHelper", BreweryHelper_address);

    //await BreweryHelper.connect(signedHolder).purchaseWithXMead("");

    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    const pair = await ethers.getContractAt(ERC20, await settings.liquidityPair());
    console.log("My LP Balance:", ethers.utils.formatUnits(await pair.balanceOf(deployer.address), await pair.decimals()));

    //await BreweryHelper.purchaseWithLP("");

    console.log("My LP Balance:", ethers.utils.formatUnits(await pair.balanceOf(deployer.address), await pair.decimals()));
    
    {
        const meadSupplyOnChain = await BreweryHelper.getMeadSupply();
        const FDVOnChain = await BreweryHelper.getFDV();
        const lpRatio = await BreweryHelper.calculateLiquidityRatio();
        const lpDiscount = await BreweryHelper.calculateLPDiscount();
        const usdcReserves = await BreweryHelper.getUSDCReserve();
        const LPPrice = await BreweryHelper.getUSDCForOneLP();
        const lpTokensFor500k = await BreweryHelper.getLPFromUSDC(ethers.utils.parseUnits("500000", 6));
        const meadForUsdc = await BreweryHelper.getMeadforUSDC();
        const meadPrice = await BreweryHelper.getUSDCForOneMead();
        const breweryPrice = await BreweryHelper.getUSDCForMead(ethers.utils.parseUnits("100", 18));
        const breweryPriceInLp = await BreweryHelper.getLPFromUSDC(breweryPrice);

        console.log("Mead Supply ONCHAIN", meadSupplyOnChain);
        console.log("FDV ONCHAIN", FDVOnChain);
        console.log("USDV RESERVES ONCHAIN", usdcReserves);
        console.log("LP Ratio", lpRatio);
        console.log("LP Discount", ethers.utils.formatUnits(lpDiscount, 2));
        console.log("USDC Reserves", ethers.utils.formatUnits(usdcReserves, 6))
        console.log("Price in USDC of 1 LP token", ethers.utils.formatUnits(LPPrice, 6));
        console.log("LP value of 500k USDC", ethers.utils.formatUnits(lpTokensFor500k, 18));
        console.log("Mead value of 1 USDC", ethers.utils.formatUnits(meadForUsdc, 18));
        console.log("Mead Price", ethers.utils.formatUnits(meadPrice, 6));
        console.log("Brewery Price (in USD)", ethers.utils.formatUnits(breweryPrice, 6));
        console.log("Brewery price (in LP)", ethers.utils.formatUnits(breweryPriceInLp, await pair.decimals()))
    }
   
    //await mead.enableTrading();
    //console.log("Enabled trading!");

    // const router = await ethers.getContractAt("IJoeRouter02", await settings.dexRouter());

    // let meadBalance = await mead.balanceOf(deployer.address);
    // let usdcBalance = await usdc.balanceOf(deployer.address);
    // console.log("Mead", ethers.utils.formatUnits(meadBalance, 18));
    // console.log("USDC", ethers.utils.formatUnits(usdcBalance, 6));

    // await usdc.approve(router.address, ethers.constants.MaxUint256);
    // await mead.approve(router.address, ethers.constants.MaxUint256);
    // await router.swapExactTokensForTokens(
    //     ethers.utils.parseUnits("1000000", 6),
    //     0, 
    //     [USDC_MAINNET, Mead_address], 
    //     deployer.address, 
    //     Math.round(Date.now()/1000) + 360
    // );
    // console.log("Bought tokens!");

    // meadBalance = await mead.balanceOf(deployer.address);
    // usdcBalance = await usdc.balanceOf(deployer.address);
    // console.log("Mead", ethers.utils.formatUnits(meadBalance, 18));
    // console.log("USDC", ethers.utils.formatUnits(usdcBalance, 6));

    // {
    //     const meadSupplyOnChain = await BreweryHelper.getMeadSupply();
    //     const FDVOnChain = await BreweryHelper.getFDV();
    //     const lpRatio = await BreweryHelper.calculateLiquidityRatio();
    //     const lpDiscount = await BreweryHelper.calculateLPDiscount();
    //     const usdcReserves = await BreweryHelper.getUSDCReserve();
    //     const LPPrice = await BreweryHelper.getUSDCForOneLP();
    //     const lpTokensFor500k = await BreweryHelper.getLPFromUSDC(ethers.utils.parseUnits("500000", 6));
    //     const meadForUsdc = await BreweryHelper.getMeadforUSDC();
    //     const meadPrice = await BreweryHelper.getUSDCForOneMead();
    //     const meadPrice2 = await BreweryHelper.getUSDCForMead(ethers.utils.parseUnits("1", 18));
    
    //     console.log("Mead Supply ONCHAIN", meadSupplyOnChain);
    //     console.log("FDV ONCHAIN", FDVOnChain);
    //     console.log("USDV RESERVES ONCHAIN", usdcReserves);
    //     console.log("LP Ratio", lpRatio);
    //     console.log("LP Discount", ethers.utils.formatUnits(lpDiscount, 2));
    //     console.log("USDC Reserves", ethers.utils.formatUnits(usdcReserves, 6))
    //     console.log("Price in USDC of 1 LP token", ethers.utils.formatUnits(LPPrice, 6));
    //     console.log("LP value of 500k USDC", ethers.utils.formatUnits(lpTokensFor500k, 18));
    //     console.log("Mead value of 1 USDC", ethers.utils.formatUnits(meadForUsdc, 18));
    //     console.log("Mead Price", ethers.utils.formatUnits(meadPrice, 6));
    //     console.log("Mead Price", ethers.utils.formatUnits(meadPrice2, 6));
    // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
