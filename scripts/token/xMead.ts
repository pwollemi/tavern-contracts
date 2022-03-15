import { ethers } from "hardhat";
import { Brewery_address, Mead_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const xMead = await ethers.getContractAt("XMead", xMead_address);
    const issued = await xMead.totalSupply();
    console.log(`Total issued ${ethers.utils.formatUnits(issued, 18)}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
