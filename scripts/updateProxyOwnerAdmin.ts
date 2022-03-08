import { ethers, upgrades } from "hardhat";

async function main() {
    // The signers
    const [deployer, addr1] = await ethers.getSigners();
    await upgrades.admin.transferProxyAdminOwnership(addr1.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
