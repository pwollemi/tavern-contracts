import { ethers } from "hardhat";
import { MARKETPLACE_ADDRESS, PREMINT_FORKED_MAINNET } from "../ADDRESSES";
import { BreweryHelper_address, Brewery_address, Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const Mead = await ethers.getContractAt("Mead", Mead_address);
    const Brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const Marketplace = await ethers.getContractAt("TavernEscrowTrader", MARKETPLACE_ADDRESS)
    console.log("Mead Whitelist", await Mead.whitelist(Marketplace.address));
    console.log("Brewery Whitelist", await Brewery.whitelist(Marketplace.address));

    await Marketplace.setBreweryPurchaseHelper(BreweryHelper_address);

    // let txCount = await deployer.getTransactionCount();
    // for(let i = 0; i < 500; ++i) {
    //     await Marketplace.createOrder(i + 1, ethers.utils.parseUnits("100", 18), { nonce: txCount + i});
    // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
