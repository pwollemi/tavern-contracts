


import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, impersonateAccounts, sleep } from "../../helper/utils";
import { STAKING_ADDRESS, TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { BreweryHelper_address, Brewery_address, RenovationHelper_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const Settings = await ethers.getContractAt("TavernSettings", settings_address)
    const Staking = await ethers.getContractAt("TavernStaking", STAKING_ADDRESS);
    const BreweryPurchaseHelper = await ethers.getContractAt("BreweryPurchaseHelper", BreweryHelper_address)
    const LP = await ethers.getContractAt("IJoePair", await Settings.liquidityPair());

    //const rewardsPerBlock = BigNumber.ethers.utils.formatUnits(await Staking.meadPerBlock(), 18);
    const blockPerDay = 36000;
    const meadPrice = await BreweryPurchaseHelper.getMeadforUSDC();
    const lpPrice = await BreweryPurchaseHelper.getUSDCForOneLP();
    const tvl = (await LP.balanceOf(STAKING_ADDRESS)).mul(await BreweryPurchaseHelper.getUSDCForOneLP()).div(1e6);
    
    //console.log("APY", rewardsPerBlock.mul(blockPerDay).mul("365").mul(meadPrice).div(tvl).mul(100))
    const poolInfo = await Staking.poolInfo();
    console.log("Pool Info", poolInfo);
    console.log("Current Rewards", await Staking.getCurrentRewardsPerBlock());
    console.log("Start Block", await Staking.startBlock());
    console.log("Base Rewards per block", ethers.utils.formatUnits(await Staking.meadPerBlock(), 18));
    console.log("1st Multipplier", await Staking.firstMultiplier());
    console.log("2nd Multipplier", await Staking.secondMultiplier());

    const userInfo = await Staking.userInfo("0xf0D41ED017dB1eBA5f58E705681c2f312BfAc5AC")
    console.log(userInfo);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
