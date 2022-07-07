import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

const Chainlink = {
  POLYGON_MAINNET: {
      LINK: "0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
      VRF_COORDINATOR: "0x3d2341ADb2D31f1c5530cDC622016af293177AE0",
      KEY_HASH: "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da",
      FEE: "100000000000000"
  },
  POLYGON_TESTNET: {
      LINK: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
      VRF_COORDINATOR: "0x8C7382F9D8f56b33781fE506E897a4F1e2d17255",
      KEY_HASH: "0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4",
      FEE: "100000000000000"
  },
  AVAX_MAINNET: {
    LINK: "0x5947BB275c521040051D82396192181b413227A3",
    VRF_COORDINATOR: "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634",
    KEY_HASH: "0x89630569c9567e43c4fe7b1633258df9f2531b62f2352fa721cf3162ee4ecb46",
    FEE: "5000000000000000"
  }
}

async function main() {
  const mead = "0xD21CdCA47Fa45A0A51eec030E27AF390ab3aa489";
  const feeTo = "";
  const feePercentage = 500;
  const game = await deployProxy(
    "BvBGame",
    mead,
    feeTo,
    feePercentage,
    Chainlink.AVAX_MAINNET.VRF_COORDINATOR,
    Chainlink.AVAX_MAINNET.LINK,
    Chainlink.AVAX_MAINNET.KEY_HASH,
    Chainlink.AVAX_MAINNET.FEE
  );
  console.log("game address", game.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
