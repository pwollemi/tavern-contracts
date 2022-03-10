


import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { impersonateAccount, impersonateAccounts, sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, renovation_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [alice, bob] = await ethers.getSigners();
    console.log(alice.address);
    console.log(bob.address);

    const deployerAddress = '0xf0D41ED017dB1eBA5f58E705681c2f312BfAc5AC';
    const oldDeployerAddress = '0x145d729EAe53DEA212cE970558D6Eb1846D15d20';
    const holderAddress = '0xc198CAe628C26076Cf94D1bfDf67E021D908646D'
    await impersonateAccount(deployerAddress);
    await impersonateAccount(oldDeployerAddress);
    await impersonateAccount(holderAddress);
    const deployer = await ethers.getSigner(deployerAddress);
    const oldDeployer = await ethers.getSigner(oldDeployerAddress);
    const holder = await ethers.getSigner(holderAddress);

    const xMead = await ethers.getContractAt("XMead", xMead_address);
    const Renovation = await ethers.getContractAt("Renovation", renovation_address);

    const RenovationPurchaseHelper = await deployProxy("RenovationPurchaseHelper", settings_address);

    // Give mint rights
    await Renovation.grantRole(await Renovation.CREATOR_ROLE(), RenovationPurchaseHelper.address)
    console.log("Renovation Helper has minter rights for Renovation");

    // Give redeem rights
    await xMead.grantRole(await xMead.REDEEMER_ROLE(), RenovationPurchaseHelper.address);
    console.log("Renovation Helper has redeemer rights for xMEAD");

    // Add some test items
    await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("100", 18), 5, 3, 1, "");
    await RenovationPurchaseHelper.addItem(ethers.utils.parseUnits("100", 18), 5, 3, 2, "");

    // Try to purcahse one
    await RenovationPurchaseHelper.purchaseWithXMead(deployer.address , 0);

    console.log("balance", await Renovation.balanceOf(deployer.address));

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
