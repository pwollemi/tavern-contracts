import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../helper/deployer";

import ERC20 from '../abis/ERC20.json';
import { sleep } from "../helper/utils";
import { PRESALE_MAINNET, USDC_MAINNET } from "./ADDRESSES";
import { readFileSync } from "fs";

async function main() {

    const [deployer, wallet42, wallet43, wallet44, wallet45, wallet46, wallet47, wallet48, wallet49] = await ethers.getSigners();

    let accounts = JSON.parse(readFileSync("./accounts.json").toString()).accounts;

    const USDC = await ethers.getContractAt(ERC20, USDC_MAINNET);
    const presale = await ethers.getContractAt("WhitelistPresale", PRESALE_MAINNET);

    await USDC.connect(wallet42).approve(presale.address, ethers.constants.MaxUint256);
    await USDC.connect(wallet43).approve(presale.address, ethers.constants.MaxUint256);
    await USDC.connect(wallet44).approve(presale.address, ethers.constants.MaxUint256);
    await USDC.connect(wallet45).approve(presale.address, ethers.constants.MaxUint256);
    await USDC.connect(wallet46).approve(presale.address, ethers.constants.MaxUint256);
    await USDC.connect(wallet47).approve(presale.address, ethers.constants.MaxUint256);
    await USDC.connect(wallet48).approve(presale.address, ethers.constants.MaxUint256);
    await USDC.connect(wallet49).approve(presale.address, ethers.constants.MaxUint256);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });