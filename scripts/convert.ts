import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../helper/deployer";

import ERC20 from '../abis/ERC20.json';
import { sleep } from "../helper/utils";
import { PRESALE_MAINNET, USDC_MAINNET } from "./ADDRESSES";
import { fstat, readFileSync, writeFileSync } from "fs";

import reputation from './reputationAirdrop.json'
import { ClassManager_address } from "./NFT_ADDRESSES";

async function main() {

    const [deployer] = await ethers.getSigners();

    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address)

    //await ClassManager.grantRole(await ClassManager.MANAGER_ROLE(), deployer.address);

    let txCount = await deployer.getTransactionCount();
    for (const [key, value] of Object.entries(reputation)) {
        await ClassManager.addReputation(key, value, { nonce: txCount});
        console.log(`Awarded ${key} reputation (${value})`)
        txCount++;
    }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });