import hre, { ethers } from "hardhat";
import { PRESALE_MAINNET, PRESALE_TESTNET, XMEAD_MAINNET, XMEAD_TESTNET } from "./ADDRESSES";
import { Brewery_address, Mead_address, RedeemHelper_address } from "./NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, rewardsPool, redeemPool] = await ethers.getSigners();
    const treasuryAddress = "0x84058A1C66e29B23A9182b727953C12d38dfC7B3" // Gnosis Treasury
    const liquidityPairAddress = "0x295f322E3Cf883925aE8CC9346e4D2B19d7dCb0c"  // Liquidity Pair (LP)

    const xMeadRedeemHelper = await ethers.getContractAt("xMeadRedeemHelper", RedeemHelper_address)
    const Brewery = await ethers.getContractAt("Brewery", Brewery_address)
    const Mead = await ethers.getContractAt("Mead", Mead_address);

    let tx;

    // 1. Redeem Pool Wallet needs to approve xMeadRedeemHelper
    tx = await Mead.connect(redeemPool).approve(xMeadRedeemHelper.address, ethers.constants.MaxUint256);
    await tx.wait();

    // 2. Rewards Pool Wallet needs to approve Brewery
    tx = await Mead.connect(rewardsPool).approve(Brewery.address, ethers.constants.MaxUint256)
    await tx.wait();
    
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
