import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { PRESALE_MAINNET, USDC_MAINNET } from "../ADDRESSES";
import { readFileSync } from "fs";

import BuggedAddresses from './bugged.json'
import { ClassManager_address } from "../NFT_ADDRESSES";

async function main() {

    const [deployer] = await ethers.getSigners();

    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address);

    let txCount = await deployer.getTransactionCount();
    for (const [key, value] of Object.entries(BuggedAddresses)) {
        if (value > 0) {
            const rep = Number((await ClassManager.getReputation(key)).toString());
            const buggedAmount = value * Number(ethers.utils.parseUnits("250", 8));
            const newReputation = (rep - buggedAmount) + value * 30;
            console.log(`${key} zapped ${value} BREWERYs and has ${rep} rep, but setting to ${newReputation}`)
            await ClassManager.removeReputation(key, Math.round(rep - newReputation), { nonce: txCount});
            txCount++;
        }
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });