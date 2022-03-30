


import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, impersonateAccounts, sleep } from "../../helper/utils";
import { STAKING_ADDRESS, TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { BreweryHelper_address, Brewery_address, ClassManager_address, RenovationHelper_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const Settings = await ethers.getContractAt("TavernSettings", settings_address)
    const BreweryPurchaseHelper = await ethers.getContractAt("BreweryPurchaseHelper", BreweryHelper_address)
    const LP = await ethers.getContractAt("IJoePair", await Settings.liquidityPair());
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address);
    const Staking = await ethers.getContractAt("TavernStaking", STAKING_ADDRESS);
    await ClassManager.grantRole(await ClassManager.MANAGER_ROLE(), STAKING_ADDRESS);
    
    //await Staking.setSettings(settings_address);

    // const startBlock = 12229150;
    // await Staking.setPoolInfo(startBlock);
    //await Staking.updatePool();
    // const blockPerDay = 37000;

    // let tx = await Staking.setStartBlock(startBlock);
    // await tx.wait();

    // tx = await Staking.setEndBlock(startBlock + blockPerDay * 180);
    // await tx.wait();

    // tx = await Staking.setBonusFirstBlockEnd(startBlock + blockPerDay * 30)
    // await tx.wait();
    // tx = await Staking.setBonusSecondBlockEnd(startBlock + blockPerDay * 90)
    // await tx.wait();


    // const meadPerDay = 500;
    // const blocksPerDay = 36000;
    // const meadPerBlock = ethers.BigNumber.from(meadPerDay).mul(ethers.BigNumber.from(10).pow(18)).div(blocksPerDay)
    // let tx = await Staking.setMeadPerBlock(meadPerBlock);
    // await tx.wait();


    // tx = await Staking.setBonusMultiplier(300, 150);
    // await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
