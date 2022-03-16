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
    
    const baseURI = "https://ipfs.tavern.money/ipfs/QmZrowT3fcdAbqe2V2DMJT7bPFT2XptbjHdg3KeKMvV1Yi"
    const types = 8;
    const tiers = 3;

    let txCount = await deployer.getTransactionCount();
    await Brewery.setBaseURI(baseURI, { nonce: txCount});
    txCount++;

    for (let type = 0; type < types; ++type) {
      for (let tier = 0; tier < tiers; ++tier) {
        const tokenURI = `/type/${type}/tier/${tier}.json`
        await Brewery.setTokenURI(type, tier, tokenURI, { nonce: txCount})
        console.log(`${baseURI}${tokenURI} set!`)
        txCount++;
      }
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
