import { ethers } from "hardhat";
import { Brewery_address, Mead_address } from "../NFT_ADDRESSES";
import ERC20 from '../../abis/ERC20.json';
import { USDC_MAINNET } from "../ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const holder = '0xc198CAe628C26076Cf94D1bfDf67E021D908646D'
    const usdc = await ethers.getContractAt(ERC20, USDC_MAINNET);
    await usdc.transfer(holder, ethers.utils.parseUnits("10000", 6));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
