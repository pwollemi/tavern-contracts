import { BigNumber } from "ethers";
import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";
import { settings_address } from "../NFT_ADDRESSES";

async function main() {

  // Deploy xMEAD
  const settings = await ethers.getContractAt("TavernSettings", settings_address);

  const blocksPerDay = 36000;
  const meadPerDay = 250;
  const startBlock = 122223858;
  const staking = await deployProxy("TavernStaking", 
        await settings.mead(), 
        await settings.liquidityPair(),
        BigNumber.from(meadPerDay).mul(BigNumber.from(10).pow(18)).div(blocksPerDay),
        startBlock,
        startBlock + blocksPerDay * 180,
        startBlock + blocksPerDay * 30,
        startBlock + blocksPerDay * 90
    );
    console.log("staking address", staking.address);
    console.log("Starting block", startBlock);
    console.log("End block", startBlock + blocksPerDay * 180);
    console.log("Reward drop (5x to 2.5x)", startBlock + blocksPerDay * 30);
    console.log("Reward drop (2.5x to 1x)", startBlock + blocksPerDay * 90);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
