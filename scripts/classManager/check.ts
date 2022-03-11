import { ethers } from "hardhat";
import { Brewery_address, ClassManager_address, Mead_address } from "../NFT_ADDRESSES";
import ERC20 from '../../abis/ERC20.json';
import { USDC_MAINNET } from "../ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();
    
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address);

    await ClassManager.grantRole(await ClassManager.MANAGER_ROLE(), deployer.address);
    await ClassManager.addReputation("0xc198CAe628C26076Cf94D1bfDf67E021D908646D", 100)
    console.log("Rep", await ClassManager.getReputation("0xc198CAe628C26076Cf94D1bfDf67E021D908646D"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
