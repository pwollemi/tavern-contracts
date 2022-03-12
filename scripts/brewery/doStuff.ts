import { ethers } from "hardhat";
import { Brewery_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, alice, bob] = await ethers.getSigners();

    const Brewery = await ethers.getContractAt("Brewery", Brewery_address)
    console.log(await Brewery.maxBreweries())
    await Brewery.setMaxBreweries(15000);
    console.log(await Brewery.maxBreweries())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
