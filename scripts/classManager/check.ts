import { ethers } from "hardhat";
import { BreweryHelper_address, Brewery_address, ClassManager_address, Mead_address } from "../NFT_ADDRESSES";
import ERC20 from '../../abis/ERC20.json';
import { USDC_MAINNET } from "../ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();
    
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address);

    const users = [
      '0x00426ec496D6AeAc556fBD3e1e00a307Ab7F5211',
      '0xe779E89CD1E26bccEDB4e5eF8EAADa20D6Ef314A',
      '0x94ed7b2effA59f1Fb9686317046A27487E1350C5',
      '0x50186626647D49f7C4b64B5E8Bc322C0514e1126',
      '0x4DfdF76c7A312599f82410E71b81948b715fB5AD',
      '0x197f4c3Cc2C89a0f4C4E2443c453f29ecdf67D4b',
      '0xE06B3e54aA92eC8c45f46D704358711F538B2454',
      '0x2aCf0d7eFCD6Bae082301A78227eEc22643D72e4',
      '0x6676F78C465ba8860A31Ae619FC1C4B4AE233bF4',
    ];
    
    for (let i = 0; i < users.length; ++i) {
      const rep = Number((await ClassManager.getReputation(users[i])).toString());
      console.log(`${rep}`)
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
