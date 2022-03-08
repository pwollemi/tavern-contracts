import { ethers } from "hardhat";
import { PREMINT_FORKED_MAINNET } from "../ADDRESSES";
import { Brewery_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const address = '0xe68328e2dba6680091829eb2ebdae410db66da07'
    const Verify = await ethers.getContractAt("DiscordVerifier", address)
    await Verify.verify("gz4fOAjbh");
    console.log("Executed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
