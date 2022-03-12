import { ethers } from "hardhat";
import { Brewery_address, Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    let addresses = [
        "0xf0D41ED017dB1eBA5f58E705681c2f312BfAc5AC", // Gnosis Treasury
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
