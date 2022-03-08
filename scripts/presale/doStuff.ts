import { ethers } from "hardhat";
import { PREMINT_FORKED_MAINNET } from "../ADDRESSES";
import { Brewery_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const Premint = await ethers.getContractAt("Premint", PREMINT_FORKED_MAINNET)
    await Premint.setWhitelistLimit(15);
    console.log("Executed!")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
