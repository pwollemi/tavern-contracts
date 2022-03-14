import hre, { ethers } from "hardhat";
import { deployAndVerifyProxy, deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, ClassManager_address, Mead_address, RedeemHelper_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const Settings = await ethers.getContractAt("TavernSettings", settings_address);
    const xMeadRedeemHelper = await ethers.getContractAt("xMeadRedeemHelper", RedeemHelper_address);
    
    // Create and set rewards pool
    const rewardsPool = await deployProxy("StoragePool", brewery.address, Mead_address);

    let tx;

    tx = await Settings.setRewardsPool(rewardsPool.address);
    await tx.wait();
    console.log("Set reward pool to ", rewardsPool.address);

    // Create and set redeem pool
    const redeemPool = await deployProxy("StoragePool", xMeadRedeemHelper.address, Mead_address);

    tx = await Settings.setRedeemPool(redeemPool.address);
    await tx.wait();
    console.log("Set redeem pool to ", redeemPool.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
