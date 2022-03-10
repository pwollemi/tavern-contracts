import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { PRESALE_MAINNET, TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, Mead_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    // address _tavernSettings, address _whitelist, uint256 _tranch, uint256 _interval
    const tranche = "1000";   // 10%
    const interval = 86400; // 1 day in seconds
    
    const xMead = await ethers.getContractAt("XMead", xMead_address);
    const Mead = await ethers.getContractAt("Mead", Mead_address);
    const xMeadRedeemHelper = await deployProxy("xMeadRedeemHelper", settings_address, PRESALE_MAINNET, tranche, interval);
    console.log("xMeadRedeemHelper", xMeadRedeemHelper.address);

    // Grant the xMeadRedeemHelper the redeemer role for xMEAD
    await xMead.grantRole(await xMead.REDEEMER_ROLE(), xMeadRedeemHelper.address);
    console.log("xMeadRedeemHelper can now redeem users xMEAD!");

    // Approve the xMeadRedeemHelper to spend the rewards pool address
    await Mead.approve(xMeadRedeemHelper.address, ethers.constants.MaxUint256);
    console.log("xMeadRedeemHelper is now approved to send the rewards pool MEAD!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
