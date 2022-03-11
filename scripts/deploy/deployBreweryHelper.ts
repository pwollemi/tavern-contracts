import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, ClassManager_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const xMead = await ethers.getContractAt("XMead", xMead_address);
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address)
    const BreweryHelper = await deployProxy("BreweryPurchaseHelper", settings_address, Brewery_address);
    console.log("Brewery Helper", BreweryHelper.address);

    // *  - Helper needs to be able to mint brewery (Brewery::MINTER_ROLE)
    await brewery.grantRole(await brewery.MINTER_ROLE(), BreweryHelper.address);
    console.log("Brewery Helper can now create/mint breweries");

    // *  - Helper should be able to burn xMEAD (XMead::REDEEMER_ROLE)
    await xMead.grantRole(await xMead.REDEEMER_ROLE(), BreweryHelper.address);
    console.log("Brewery Helper can now redeem xmead");

    // *  - Helper should be able to award rep (ClassManager::MANAGER_ROLE)
    await ClassManager.grantRole(await ClassManager.MANAGER_ROLE(), BreweryHelper.address);
    console.log("Brewery Helper can now award reputation!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
