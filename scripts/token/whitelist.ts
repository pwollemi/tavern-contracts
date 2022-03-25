import { ethers } from "hardhat";
import { BreweryHelper_address, Brewery_address, Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    let addresses = [
        '0x145d729EAe53DEA212cE970558D6Eb1846D15d20',
    ]

    const Mead = await ethers.getContractAt("Mead", Mead_address);

    for(let i = 0; i < addresses.length; ++i) {
        let tx = await Mead.setWhitelist(addresses[i], true);
        await tx.wait();
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
