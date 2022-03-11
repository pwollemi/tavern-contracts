import { ethers } from "hardhat";
import { impersonateAccount } from "../../helper/utils";
import { Brewery_address, ClassManager_address, Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const holderAddress = "0xc198CAe628C26076Cf94D1bfDf67E021D908646D";
    await impersonateAccount(holderAddress);
    const holder = await ethers.getSigner(holderAddress);

    const Mead = await ethers.getContractAt("Mead", Mead_address)
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address)
    const Brewery = await ethers.getContractAt("Brewery", Brewery_address)

    await Mead.approve(Brewery.address, ethers.constants.MaxUint256)
    await ClassManager.grantRole(await ClassManager.MANAGER_ROLE(), Brewery.address);

    await Brewery.connect(holder).compoundAll();
    console.log("Compounding all!")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
