import { ethers } from "hardhat";
import { impersonateAccount } from "../helper/utils";
import { Mead_address, RenovationHelper_address } from "./NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const holderAddress = "0xc198CAe628C26076Cf94D1bfDf67E021D908646D";
    await impersonateAccount(holderAddress);
    const holder = await ethers.getSigner(holderAddress);
    const mead = await ethers.getContractAt("Mead", Mead_address);

    await mead.connect(holder).approve(RenovationHelper_address, ethers.constants.MaxUint256);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
