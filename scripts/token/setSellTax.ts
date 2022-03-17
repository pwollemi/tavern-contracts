import { ethers } from "hardhat";
import { Brewery_address, Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const sellTax = 10;
    const Mead = await ethers.getContractAt("Mead", Mead_address);
    await Mead.setSellTax(sellTax);
    console.log(`Sell tax set to ${sellTax}%`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
