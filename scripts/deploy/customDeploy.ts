import hre, { ethers } from "hardhat";
import { deployAndVerifyProxy, deployContract, deployProxy } from "../../helper/deployer";
import { Brewery_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const contract = await deployAndVerifyProxy("DiscordVerifier", Brewery_address);
    console.log("Contract:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
