import { ethers } from "hardhat";
import { USDC_MAINNET } from "../ADDRESSES";
import { Brewery_address, Mead_address, RedeemHelper_address, settings_address } from "../NFT_ADDRESSES";

import ERC20 from "../../abis/ERC20.json"

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    console.log("Deployer Address", deployer.address);
    console.log("AVAX", ethers.utils.formatEther(await deployer.getBalance()));
    const mead = await ethers.getContractAt("Mead", Mead_address);
    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    const router = await ethers.getContractAt("IJoeRouter02", await settings.dexRouter());
    const factory = await ethers.getContractAt("IJoeFactory", await router.factory());
    const redeemer = await ethers.getContractAt("XMeadRedeemHelper", RedeemHelper_address)
    const usdc = await ethers.getContractAt(ERC20, USDC_MAINNET)

    const meadBalance = await mead.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("Mead", ethers.utils.formatUnits(meadBalance, 18));
    console.log("USDC", ethers.utils.formatUnits(usdcBalance, 6));


    //await factory.createPair(Mead_address, USDC_MAINNET);
    const pair = await factory.getPair(Mead_address, USDC_MAINNET);

    await mead.approve(router.address, ethers.constants.MaxUint256);
    await mead.approve(pair, ethers.constants.MaxUint256);
    await usdc.approve(router.address, ethers.constants.MaxUint256);
    await usdc.approve(pair, ethers.constants.MaxUint256);
    console.log("Approved MEAD and USDC");

    await mead.setWhitelist(router.address, false);
    await mead.setWhitelist(pair, false);
    console.log("Set whitelist for router and pair");

    // Launch liquidity pool
    await router.addLiquidity(
        Mead_address,
        USDC_MAINNET,
        ethers.utils.parseUnits("500000", 18),
        ethers.utils.parseUnits("500000", 6),
        0,
        0,
        deployer.address,
        Math.round(Date.now()/1000) + 360,
    );
    console.log("Liquidity added!");

    // Set start time for BREWERY rewards to now
    await brewery.setStartTime(Math.round(Date.now()/1000));

    // Set enable for redeemer 
    await redeemer.enable(true);

    const amountsOut = await router.getAmountsIn(ethers.utils.parseUnits('1', 6), [Mead_address, USDC_MAINNET]);
    console.log(amountsOut);
    console.log("Price of MEAD for 1 USDC:", ethers.utils.formatUnits(amountsOut[1], 6));

    // await router.swapExactAVAXForTokens(
    //     0, 
    //     ['0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', USDC_MAINNET], 
    //     deployer.address, 
    //     Math.round(Date.now()/1000) + 360, 
    //     { value: ethers.utils.parseEther("100000")}
    // );
    // console.log("Bought tokens!");

    // Enable trading for MEAD

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
