import { ethers } from "hardhat";
import { Brewery_address, Mead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    let addresses = [
        "0xf0D41ED017dB1eBA5f58E705681c2f312BfAc5AC", // Deploy
        "0x84058A1C66e29B23A9182b727953C12d38dfC7B3", // Gnosis Treasury
        "0x19180De71fb5100f900D08Fa6973b92e5aBE024a", // Rewards Pool
        "0x4E65eae6823BC390a4ED1b6Ba616931Dad04c6f2", // Redeem Pool
        "0x295f322E3Cf883925aE8CC9346e4D2B19d7dCb0c"  // Liquidity Pair (LP)
    ]

    const Mead = await ethers.getContractAt("Mead", Mead_address);
    console.log("Trading Enabled", await Mead.isTradingEnabled());
    console.log("Brewery", await Mead.breweryAddress());
    console.log("Taverns Keep", await Mead.tavernsKeep());
    for(let i = 0; i < addresses.length; ++i) {
        let whitelist = await Mead.whitelist(addresses[i]);
        let blacklist = await Mead.blacklist(addresses[i]);
        console.log("Whitelist", addresses[i], whitelist);
        console.log("Blacklist", addresses[i], blacklist);
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
