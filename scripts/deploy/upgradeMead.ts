import hre, { ethers, upgrades } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { PRESALE_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const MeadContract = await ethers.getContractAt("Mead", Mead_address);
    console.log("owneer", await MeadContract.owner());

    console.log('d', deployer.address);
    console.log('a', addr1.address);
    
    const mead = await ethers.getContractFactory("Mead");
    await upgrades.upgradeProxy(Mead_address, mead);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
