

import { ethers } from "hardhat";
import { text } from "stream/consumers";
import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount } from "../../helper/utils";
import { USDC_MAINNET } from "../ADDRESSES";
import { Brewery_address, Mead_address, settings_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, rewardPool, redeemPool, rainbowDeploy] = await ethers.getSigners();

    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    const router = await ethers.getContractAt("IJoeRouter02", await settings.dexRouter());
    const mead = await ethers.getContractAt("Mead", Mead_address);
    const usdc = await ethers.getContractAt(ERC20, USDC_MAINNET);

    let tx;

    const account = rainbowDeploy;
    let meadBalance = await mead.balanceOf(account.address);
    let usdcBalance = await usdc.balanceOf(account.address);
    console.log("Mead", ethers.utils.formatUnits(meadBalance, 18));
    console.log("USDC", ethers.utils.formatUnits(usdcBalance, 6));

    tx = await usdc.connect(account).approve(router.address, ethers.constants.MaxUint256);
    await tx.wait()
    tx = await mead.connect(account).approve(router.address, ethers.constants.MaxUint256);
    await tx.wait()
    console.log("Approved!");

    tx = await router.connect(account).swapExactTokensForTokens(
        ethers.utils.parseUnits("20000", 6),
        0, 
        [USDC_MAINNET, Mead_address], 
        account.address, 
        Math.round(Date.now()/1000) + 360
    );
    await tx.wait()
    console.log("Bought tokens!");
    
    meadBalance = await mead.balanceOf(account.address);
    usdcBalance = await usdc.balanceOf(account.address);
    console.log("Mead", ethers.utils.formatUnits(meadBalance, 18));
    console.log("USDC", ethers.utils.formatUnits(usdcBalance, 6));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
