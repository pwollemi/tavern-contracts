import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const Brewery = await ethers.getContractAt("Brewery", Brewery_address)
    
    const baseURI = "https://ipfs.tavern.money/ipfs/QmRxxZvujy4uSihCJ8vRU1vacdDKoterG5Rwsfz2cmTwqU"
    const types = 8;
    const tiers = 3;

    await Brewery.setBaseURI(baseURI)
    for (let type = 0; type < types; ++type) {
      for (let tier = 0; tier < tiers; ++tier) {
        const tokenURI = `/type/${type}/tier/${tier}.json`
        let tx = await Brewery.setTokenURI(type, tier, tokenURI)
        await tx.wait();
        console.log(`${baseURI}${tokenURI} set!`)
      }
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
