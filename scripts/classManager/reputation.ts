import { ethers } from "hardhat";
import { BreweryHelper_address, Brewery_address, ClassManager_address, Mead_address } from "../NFT_ADDRESSES";
import ERC20 from '../../abis/ERC20.json';
import { USDC_MAINNET } from "../ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();
    
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address);
    await ClassManager.addReputation('0x5C3d14e1DA2D26A86f46CBb8c05F51F9ff199390', '320')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
