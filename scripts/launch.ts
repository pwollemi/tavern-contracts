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

    // Set sell tax to 0
    tx = await mead.setSellTax(0);
    await tx.wait();
    console.log("Set tax to zero");

    // Whitelist deployer and liquidity
    const pair = await factory.getPair(Mead_address, USDC_MAINNET);
    tx = await mead.setWhitelist(deployer.address, true);
    await tx.wait();
    tx = await mead.setWhitelist(pair, true);
    await tx.wait();
    console.log("Whitelisted deployer & liquidity pair");

    // Approve router and pair to spend our tokens
    tx = await mead.approve(router.address, ethers.constants.MaxUint256);
    await tx.wait();
    tx = await mead.approve(pair, ethers.constants.MaxUint256);
    await tx.wait();
    tx = await usdc.approve(router.address, ethers.constants.MaxUint256);
    await tx.wait();
    tx = await usdc.approve(pair, ethers.constants.MaxUint256);
    await tx.wait();
    console.log("Approved MEAD and USDC on Router & Pair");

    // Launch liquidity pool
    tx = await router.addLiquidity(
        Mead_address,
        USDC_MAINNET,
        ethers.utils.parseUnits("500000", 18),
        ethers.utils.parseUnits("500000", 6),
        0,
        0,
        deployer.address,
        Math.round(Date.now()/1000) + 360,
    );
    await tx.wait();
    console.log(" ======= Liquidity added! =========");

    // Disable whitelist on liquidity pool and set sell tax back to 25%
    tx = await mead.setSellTax(25);
    await tx.wait();
    console.log("Set tax to zero");
    tx = await mead.setWhitelist(pair, false);
    await tx.wait();
    console.log("Whitelisted deployer & liquidity pair");

    const amountsOut = await router.getAmountsIn(ethers.utils.parseUnits('1', 6), [Mead_address, USDC_MAINNET]);
    console.log(amountsOut);
    console.log("Price of MEAD for 1 USDC:", ethers.utils.formatUnits(amountsOut[1], 6));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
