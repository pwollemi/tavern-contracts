import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const renovation = await ethers.getContractAt("Renovation", renovation_address);
    const xMead = await ethers.getContractAt("XMead", xMead_address);
    const RenovationHelper = await deployProxy("Renovation", Brewery_address);
    console.log("RenovationHelper: ", RenovationHelper.address);

    // *  - Helper needs to be able to mint renovations (Renovation::CREATOR_ROLE)
    await renovation.grantRole(await renovation.CREATOR_ROLE(), RenovationHelper.address);
    console.log("Renovation Helper can now create/mint renovations");

    // *  - Helper should be able to burn xMEAD (XMead::REDEEMER_ROLE)
    await xMead.grantRole(await xMead.REDEEMER_ROLE(), RenovationHelper.address);
    console.log("Renovation Helper can now redeem xmead");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
