import hre, { ethers } from "hardhat";
import { XMead } from "../../typechain";
import { PREMINT_FORKED_MAINNET } from "../ADDRESSES";
import { Brewery_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const XMead = await ethers.getContractAt("XMead", xMead_address);
    const Brewery = await ethers.getContractAt("Brewery", Brewery_address)

    // Let the presale contract issue xMEAD
    await Brewery.connect(deployer).grantRole(await Brewery.MINTER_ROLE(), PREMINT_FORKED_MAINNET);
    console.log(`Premint contract (${PREMINT_FORKED_MAINNET}) is enabled to mint BREWERYs!`);

    await XMead.grantRole(await XMead.REDEEMER_ROLE(), PREMINT_FORKED_MAINNET);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
