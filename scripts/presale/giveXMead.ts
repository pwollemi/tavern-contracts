import hre, { ethers } from "hardhat";
import { PREMINT_FORKED_MAINNET } from "../ADDRESSES";
import { Brewery_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const XMead = await ethers.getContractAt("XMead", xMead_address);
    await XMead.grantRole(await XMead.ISSUER_ROLE(), deployer.address);
    await XMead.issue("0x1bA1d0F472f44c8f41f65CA10AB43A038969DF57", ethers.utils.parseUnits("10000", await XMead.decimals()))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
