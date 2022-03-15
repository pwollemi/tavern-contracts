


import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, impersonateAccounts, sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, RenovationHelper_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const xMead = await ethers.getContractAt("XMead", xMead_address);
    const Renovation = await ethers.getContractAt("Renovation", renovation_address);

    // Deploy the renovation purcahse helper
    const RenovationPurchaseHelper = await ethers.getContractAt("RenovationPurchaseHelper", RenovationHelper_address);

    // Add some test items
    let tx; 
    // // Add Reinforced Vats (10 MEAD and 5% increased yield)
    // tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("10", 18), 500, 0, 10500, "");
    // await tx.wait();

    // // Add Metal Kegs (30 MEAD and 10% increased yield)
    // tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("30", 18), 500, 0, 11000, "");
    // await tx.wait();

    //tx = await RenovationPurchaseHelper.setItem(10, 1, 9500, "");
    //await tx.wait();

    //tx = await RenovationPurchaseHelper.setItem(11, 1, 9000, "");
    //await tx.wait();

    //tx = await RenovationPurchaseHelper.setItem(12, 1, 8500, "");
    //await tx.wait();

    // // Cool fermentation (25 MEAD and 5% decreased fermentation)
    // tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("25", 18), 500, 1, 9500, "");
    // await tx.wait();

    // // Warm fermentation (60 MEAD and 10% decreased fermentation)
    // tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("60", 18), 500, 1, 9000, "");
    // await tx.wait();

    // // Turbo yeast (150 MEAD and 15% decreased fermentation)
    // tx = await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("150", 18), 500, 1, 8500, "");
    // await tx.wait();

    console.log("Total Items", await RenovationPurchaseHelper.totalItems());

    // Try to purcahse one
    //await RenovationPurchaseHelper.purchaseWithXMead(deployer.address , 0);

    //console.log("balance", await Renovation.balanceOf(deployer.address));

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
