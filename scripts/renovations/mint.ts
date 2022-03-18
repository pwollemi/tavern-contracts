


import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, renovation_address, settings_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const Settings = await ethers.getContractAt("TavernSettings", settings_address)
    const Renovation = await ethers.getContractAt("Renovation", await Settings.renovationAddress());

    const count = 1;
    for (let i = 0; i < count; ++i) {
        let tx = await Renovation.create("0x8b2cd5f5063432a40365a131116cead80c834a91", 0, 11000, "");
        await tx.wait();
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
