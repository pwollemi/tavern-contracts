import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { BreweryHelper_address, Brewery_address, ClassManager_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address)

    const price = ethers.utils.parseUnits("100", 6);
    const productionRate = ethers.utils.parseUnits("0.5", 6);
    const HomekitManager = await deployProxy("HomekitManager", 
        settings_address, 
        Brewery_address,
        BreweryHelper_address,
        price, 
        productionRate
    );
    console.log("HomekitManager", HomekitManager.address);

    // *  - Helper needs to be able to mint brewery (Brewery::MINTER_ROLE)
    await brewery.grantRole(await brewery.MINTER_ROLE(), HomekitManager.address);
    console.log("HomekitManager can now create/mint breweries");

    // *  - Helper should be able to award rep (ClassManager::MANAGER_ROLE)
    await ClassManager.grantRole(await ClassManager.MANAGER_ROLE(), HomekitManager.address);
    console.log("HomekitManager can now award reputation!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
