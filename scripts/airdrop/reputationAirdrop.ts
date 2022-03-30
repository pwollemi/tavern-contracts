import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { PRESALE_MAINNET, USDC_MAINNET } from "../ADDRESSES";
import { readFileSync } from "fs";

import StakingData from './staking.json'
import { ClassManager_address } from "../NFT_ADDRESSES";

async function main() {

    const [deployer] = await ethers.getSigners();

    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address);
    const LP = await ethers.getContractAt("IJoePair", "0x295f322E3Cf883925aE8CC9346e4D2B19d7dCb0c")

    const supply = Number(ethers.utils.formatUnits(await LP.totalSupply(), 18));
    const reserves = await LP.getReserves();

    let usdcReserves = 0;
    if (await LP.token0() == USDC_MAINNET) {
        usdcReserves =  Number(ethers.utils.formatUnits(reserves.reserve0, 6));
    } else {
        usdcReserves =  Number(ethers.utils.formatUnits(reserves.reserve1, 6));
    }

    const lpPrice = usdcReserves * 2 / supply;

    const lpAmount = 1000 / lpPrice;

    const reputationPerLP = Number(ethers.utils.parseUnits("250", 4));

    let txCount = await deployer.getTransactionCount();
    for (const [key, value] of Object.entries(StakingData)) {
        const amount = Number(ethers.utils.formatUnits(value, 18));
        if (amount > 0) {
            const reputation = Math.floor(amount * reputationPerLP);
            console.log(`Airdropping ${key} (${amount} LP tokens - $${amount * lpPrice}): ${reputation} rep`)
            await ClassManager.addReputation(key, reputation, { nonce: txCount});
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