
import { ethers } from "hardhat";
import { Brewery_address, Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const Mead = await ethers.getContractAt("Mead", Mead_address);
    //await Mead.setBreweryAddress(Brewery_address);
    //console.log("Configured brewery!");

    await Mead.setTavernsKeep("0x84058A1C66e29B23A9182b727953C12d38dfC7B3")

    console.log("Current brewery address", await Mead.breweryAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
