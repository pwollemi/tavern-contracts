


import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, impersonateAccounts, sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, Mead_address, RenovationHelper_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    // Deploy the renovation purcahse helper
    const RenovationPurchaseHelper = await ethers.getContractAt("RenovationPurchaseHelper", RenovationHelper_address);

    // const mead = await ethers.getContractAt("Mead", Mead_address);
    // await mead.approve(RenovationPurchaseHelper.address, ethers.constants.MaxUint256);
    let tx;
    // Add some test items
    tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("100", 18), ethers.constants.MaxUint256, 3, 0, "");
    await tx.wait();
    console.log("Added item!");

    tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("300", 18), ethers.constants.MaxUint256, 3, 1, "");
    await tx.wait();
    console.log("Added item!");

    tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("300", 18), ethers.constants.MaxUint256, 3, 2, "");
    await tx.wait();
    console.log("Added item!");

    tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("300", 18), ethers.constants.MaxUint256, 3, 3, "");
    await tx.wait();
    console.log("Added item!");

    tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("500", 18), ethers.constants.MaxUint256, 3, 4, "");
    await tx.wait();
    console.log("Added item!");

    tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("1000", 18), ethers.constants.MaxUint256, 3, 5, "");
    await tx.wait();
    console.log("Added item!");

    tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("2000", 18), ethers.constants.MaxUint256, 3, 6, "");
    await tx.wait();
    console.log("Added item!");

    tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("5000", 18), ethers.constants.MaxUint256, 3, 7, "");
    await tx.wait();
    console.log("Added item!");

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
