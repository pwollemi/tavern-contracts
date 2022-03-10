import { ethers } from "hardhat";
import { deployProxy } from "../../helper/deployer";
import { impersonateAccount, impersonateAccounts, sleep, stopImpersonatingAccount } from "../../helper/utils";
import { PREMINT_FORKED_MAINNET, PRESALE_MAINNET } from "../ADDRESSES";
import { Brewery_address, Mead_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [alice, bob] = await ethers.getSigners();

    const deployerAddress = '0xf0D41ED017dB1eBA5f58E705681c2f312BfAc5AC';
    const oldDeployerAddress = '0x145d729EAe53DEA212cE970558D6Eb1846D15d20';
    const holderAddress = '0xc198CAe628C26076Cf94D1bfDf67E021D908646D'
    await impersonateAccount(deployerAddress);
    await impersonateAccount(oldDeployerAddress);
    await impersonateAccount(holderAddress);

    const deployer = await ethers.getSigner(deployerAddress);
    const oldDeployer = await ethers.getSigner(oldDeployerAddress);
    const signedHolder = await ethers.getSigner(holderAddress);

    // address _tavernSettings, address _whitelist, uint256 _tranch, uint256 _interval
    const tranche = "1000";   // 10%
    const interval = 86400; // 1 day in seconds
    
    const xMead = await ethers.getContractAt("XMead", xMead_address);
    const Mead = await ethers.getContractAt("Mead", Mead_address);
    const xMeadRedeemHelper = await deployProxy("xMeadRedeemHelper", settings_address, PRESALE_MAINNET, tranche, interval);
    console.log("xMeadRedeemHelper", xMeadRedeemHelper.address);

    // Enable xMeadRedeemHelper!
    await xMeadRedeemHelper.enable(true);
    console.log("xMeadRedeemHelper is now enabled!");

    // Grant the xMeadRedeemHelper the redeemer role for xMEAD
    await xMead.connect(oldDeployer).grantRole(await xMead.REDEEMER_ROLE(), xMeadRedeemHelper.address);
    console.log("xMeadRedeemHelper can now redeem users xMEAD!");

    // Approve the xMeadRedeemHelper to spend the rewards pool address
    await Mead.connect(deployer).approve(xMeadRedeemHelper.address, ethers.constants.MaxUint256);
    console.log("xMeadRedeemHelper is now approved to send the rewards pool MEAD!");

    console.log("Current Interval", await xMeadRedeemHelper.getInterval());
    await sleep(interval * 1000);

    await xMeadRedeemHelper.connect(signedHolder).redeem(ethers.utils.parseUnits('132', 18))
    console.log("Redeemed 132 xMEAD");
    console.log("MeadBalance", ethers.utils.formatUnits(await Mead.balanceOf(signedHolder.address), 18));
    console.log("xMeadBalance", ethers.utils.formatUnits(await xMead.balanceOf(signedHolder.address), 18));

    await xMeadRedeemHelper.connect(signedHolder).redeem(ethers.utils.parseUnits('1', 18))
    console.log("Redeemed 1 xMEAD");

    console.log("Current Interval", await xMeadRedeemHelper.getInterval());
    await sleep(interval * 1000);

    console.log("Current Interval", await xMeadRedeemHelper.getInterval());
    await sleep(interval * 1000);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
