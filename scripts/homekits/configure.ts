import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, impersonateAccounts, sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, HomekitManager_address, RenovationHelper_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const HomekitManager = await ethers.getContractAt("HomekitManager", HomekitManager_address);
    
    //await HomekitManager.setHomekitWalletLimit(500);

    const productionRate = ethers.utils.parseUnits("75", 5).div(86400);
    console.log("Prod. Rate:", productionRate);
    return;
    await HomekitManager.setProductionRatePerSecond(productionRate.div(86400))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
