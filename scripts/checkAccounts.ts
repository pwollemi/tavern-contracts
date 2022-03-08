import { ethers } from "hardhat";

async function main() {
    // The signers
    const [deployer, addr1] = await ethers.getSigners();
    console.log("deployer", deployer.address);
    console.log("addr1", addr1.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
