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
      ["0xd57d3f0f31047F2c5e1F1b09F96eFd23C05b1d5b", 1],
      ["0x50ccdF5dF5D1f50106625cB909C39EDe1CA966cC", 1],
      ["0x2d2c9eB957aAC298DbD47ce8306e7eef1725B97E", 1],
      ["0xb2C9760a0C46DfBA92c87F3967E36d0aB3Aae7C3", 1],
      ["0xd54357DAf1ba86f1B06Ec3aBC655Bd28721519B6", 1],
      ["0x6BEd1a4dBce8631725AcDD6901F67cc42e23b3e9", 1],
      ["0x09A6053d65A837d4F777bdbF51947bef243EA107", 1],
      ["0x43f13b1B5C812848e87a5e895e4FFA4B0A248b88", 1],
      ["0xAC2f96c7f00450c49F5489D5ea70d04a8aA267a6", 1],
      ["0xb587Ba9f75236ed1817926ee48bf973191d11A4a", 1],
      ["0x8cA4BDF986676DF543Efa355Da2c447Fe562A0c1", 1],
      ["0x20c1B3b7A26F4a1855121c362e4D8F83F4Fabe29", 1],
      ["0x3FC4b704569883944a9B281509bF5aD4210B9DD9", 2],
      ["0xd8071C50C49A0fD423988f78705B665B6aA2Afcb", 2],
      ["0xac56F47CccB88efE36a3CeBE086064166b05f8C0", 1],
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
