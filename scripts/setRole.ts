import hre, { ethers } from "hardhat";
import { PRESALE_MAINNET, PRESALE_TESTNET, XMEAD_MAINNET, XMEAD_TESTNET } from "./ADDRESSES";

async function main() {
    // The signers
    const [deployer, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const presale = await ethers.getContractAt("WhitelistPresale", PRESALE_MAINNET);
    const xMead = await ethers.getContractAt("XMead", XMEAD_MAINNET);

    // Let the presale contract issue xMEAD
    await xMead.connect(addr1).grantRole(await xMead.DEFAULT_ADMIN_ROLE(), deployer.address);
    console.log(`Address (${deployer.address}) is now an admin for xMead!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
