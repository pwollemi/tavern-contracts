import { ethers } from "hardhat";
import { BreweryHelper_address, Brewery_address, ClassManager_address, Mead_address } from "../NFT_ADDRESSES";
import ERC20 from '../../abis/ERC20.json';
import { USDC_MAINNET } from "../ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();
    
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address);
    const thresholds = await ClassManager.getClassThresholds();
    console.log(thresholds);

    console.log("rep", await ClassManager.getReputation('0xa6d15819a524e209f3ebb5016b76ca78ce032eee'))
    //await ClassManager.removeReputation('0xa6d15819a524e209f3ebb5016b76ca78ce032eee', '50000000000')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
