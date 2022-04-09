import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, Mead_address, settings_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const Settings = await ethers.getContractAt("TavernSettings", settings_address);
    const Mead = await ethers.getContractAt("Mead", Mead_address);
    const Brewery = await ethers.getContractAt("Brewery", Brewery_address);

    // dependenceies:
    // TavernSettings settings,
    // Mead mead,
    // Brewery brewery
    const Marketplace = await deployProxy("TavernEscrowTrader", Settings.address, Mead.address, Brewery.address);
    console.log("Deployed NFT Marketplace: ", Marketplace.address);

    // Set fees
    let tx = await Marketplace.setCancellationFee(ethers.utils.parseUnits("0.25", 18));
    await tx.wait();
    tx = await Settings.setMarketplaceFee(2500);
    await tx.wait();
    tx = await Settings.setMarketplaceMeadFee(1500);
    await tx.wait();
    console.log("Set fees");

    // Whitelist Marketplace
    tx = await Mead.setWhitelist(Marketplace.address, true);
    await tx.wait();
    tx = await Brewery.setWhitelisted(Marketplace.address, true);
    await tx.wait();
    console.log("Set whitelist for MEAD and BREWERY");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
