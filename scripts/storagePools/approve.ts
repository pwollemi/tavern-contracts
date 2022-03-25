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

    const spender = '0xC46B6D27091A79552F7F6B64c94c8A57C21F5bcb'
    tx = await rewardsPool.approve(spender, Mead_address);
    await tx.wait();
    console.log("Rewrads pool has approved", spender, "to spedn MEAD");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
