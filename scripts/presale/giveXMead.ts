import hre, { ethers } from "hardhat";
import { PREMINT_FORKED_MAINNET } from "../ADDRESSES";
import { Brewery_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const XMead = await ethers.getContractAt("XMead", xMead_address);
    await XMead.grantRole(await XMead.ISSUER_ROLE(), deployer.address);
    await XMead.issue("0xc198CAe628C26076Cf94D1bfDf67E021D908646D", ethers.utils.parseUnits("10000", await XMead.decimals()))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
