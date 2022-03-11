


import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, impersonateAccounts, sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, RenovationHelper_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const holderAddress = "0xc198CAe628C26076Cf94D1bfDf67E021D908646D";
    await impersonateAccount(holderAddress);
    const holder = await ethers.getSigner(holderAddress);

    // Deploy the renovation purcahse helper
    const Renovation = await ethers.getContractAt("Renovation", renovation_address);
    const RenovationPurchaseHelper = await ethers.getContractAt("RenovationPurchaseHelper", RenovationHelper_address);


    console.log("Renovation", await Renovation.totalSupply());

    await Renovation.create(holderAddress, 3, 5, "");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
