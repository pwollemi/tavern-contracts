import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { BreweryHelper_address, Brewery_address, ClassManager_address, Mead_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const xMead = await ethers.getContractAt("XMead", xMead_address);
    const mead = await ethers.getContractAt("Mead", Mead_address);
    const usdc = await ethers.getContractAt(ERC20, USDC_MAINNET);
    const classManager = await ethers.getContractAt("ClassManager", ClassManager_address);
    const BreweryHelper = await ethers.getContractAt("BreweryPurchaseHelper", BreweryHelper_address);


    let tx;

    tx = await BreweryHelper.setMinLiquidityDiscount(1000);
    await tx.wait();
    tx = await BreweryHelper.setMaxLiquidityDiscount(4000);
    await tx.wait();
    
    // tx = await BreweryHelper.setConversionPeriodRequirement(1);
    // await tx.wait();

    // await router.swapExactAVAXForTokens(
    //     0, 
    //     ['0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', USDC_MAINNET], 
    //     deployer.address, 
    //     Math.round(Date.now()/1000) + 360, 
    //     { value: ethers.utils.parseEther("100000")}
    // );
    // console.log("Bought tokens!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
