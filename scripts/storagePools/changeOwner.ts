import hre, { ethers } from "hardhat";
import { deployAndVerifyProxy, deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { REDEEM_POOL_ADDRESS, REWARD_POOL_ADDRESS, TRADERJOE_ROUTER_MAINNET, TreasuryAddress, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, ClassManager_address, Mead_address, RedeemHelper_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const Settings = await ethers.getContractAt("TavernSettings", settings_address);
    const xMeadRedeemHelper = await ethers.getContractAt("xMeadRedeemHelper", RedeemHelper_address);

    const rewardsPool = await ethers.getContractAt("StoragePool", REWARD_POOL_ADDRESS);
    const redeemPool = await ethers.getContractAt("StoragePool", REDEEM_POOL_ADDRESS);

    const newOwner = TreasuryAddress;

    let tx;

    tx = await rewardsPool.transferOwnership(newOwner);
    await tx.wait();
    console.log("Changed owner of rewards pool", newOwner);

    // Create and set redeem pool
    tx = await redeemPool.transferOwnership(newOwner);
    console.log("Changed owner of redeem pool", newOwner);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
