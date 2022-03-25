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

    // Create and set redeem pool
    let tx = await redeemPool.drain('0xD21CdCA47Fa45A0A51eec030E27AF390ab3aa489');
    console.log("Drained Redeem Pool", redeemPool.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
