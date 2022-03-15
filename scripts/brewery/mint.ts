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
      ["0x712a81B587AbcaA64EA8FF2F0201F2379BF120E7", 1],
    ]

    let minted = 0;
    for (let i = 0; i < addresses.length; ++i) {
      const address = addresses[i][0];
      const amount = addresses[i][1];
      for (let j = 0; j < amount; ++j) {
        try {
          let tx = await Brewery.mint(address.toString(), "");
          await tx.wait();
          console.log(`Minted ${j+1}`)
          minted++;
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
