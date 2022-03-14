
import { ethers } from "hardhat";
import { Brewery_address, Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const Mead = await ethers.getContractAt("Mead", Mead_address);
    await Mead.withdrawToken('0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E')
    
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
