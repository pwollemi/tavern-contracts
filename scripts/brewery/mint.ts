import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, alice] = await ethers.getSigners();

    const Brewery = await ethers.getContractAt("Brewery", Brewery_address)
    console.log("Current Supply", await Brewery.totalSupply());

    let addresses = [
      ["0x04FaF8D329F491B19c47561Dee5bd379d7b9AFeC", 4],
      ["0x95886Ae20C0A55880aaCb1E05081Eda4FC1a105C", 2],
    ]

    let minted = 0;
    let txCount = await deployer.getTransactionCount();
    for (let i = 0; i < addresses.length; ++i) {
      const address = addresses[i][0];
      const amount = addresses[i][1];
      console.log(`Minting ${amount} BREWERYs to ${address}`)
      for (let j = 0; j < amount; ++j) {
        try {
          await Brewery.mint(address.toString(), "", {nonce: txCount});
          console.log(`\tMinted ${j+1}`)
          minted++;
          txCount++;
        } catch(e) {
          console.log(`Couldn't airdrop ${address}`)
          break;
        }
      }
    
      console.log(`Finished minting ${amount} BREWERYs to ${address}!`);
    }

    console.log("Minted", minted, "brewerys");
    console.log("New Supply", await Brewery.totalSupply());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
