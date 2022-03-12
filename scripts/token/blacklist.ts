import { ethers } from "hardhat";
import { Brewery_address, Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    let addresses = []

    const Mead = await ethers.getContractAt("Mead", Mead_address);

    for(let i = 0; i < addresses.length; ++i) {
        let tx = await Mead.setBlacklist(addresses[i], true);
        await tx.wait();
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
