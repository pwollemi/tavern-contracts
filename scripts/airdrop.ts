import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../helper/deployer";

import ERC20 from '../abis/ERC20.json';
import { sleep } from "../helper/utils";
import { PRESALE_MAINNET, USDC_MAINNET } from "./ADDRESSES";
import { readFileSync } from "fs";

async function main() {

    const [deployer] = await ethers.getSigners();

    let accounts = [

    ]

    let avax = 2;
    
    let txCount = await deployer.getTransactionCount();
    for (let i = 0; i < accounts.length; ++i) {
        await deployer.sendTransaction({value: ethers.utils.formatEther(avax), nonce: txCount});
        txCount++;
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });