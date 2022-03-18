import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../helper/deployer";

import ERC20 from '../abis/ERC20.json';
import { sleep } from "../helper/utils";
import { PRESALE_MAINNET, PRESALE_TESTNET, REDEEM_POOL_ADDRESS, REWARD_POOL_ADDRESS, STAKING_ADDRESS, USDC_MAINNET, XMEAD_MAINNET } from "./ADDRESSES";
import { BreweryHelper_address, Brewery_address, ClassManager_address, Mead_address, RedeemHelper_address, RenovationHelper_address, renovation_address, settings_address, xMead_address } from "./NFT_ADDRESSES";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    const proxyAdmin = await ethers.getContractAt("ProxyAdmin", '0x0B69b4A89991ad8175a642eF00BddDD0689b4754');

    let proxies = [
        xMead_address,
        Mead_address,
        ClassManager_address,
        settings_address,
        Brewery_address,
        renovation_address,
        RedeemHelper_address,
        RenovationHelper_address,
        BreweryHelper_address,
        REWARD_POOL_ADDRESS,
        REDEEM_POOL_ADDRESS,        
        STAKING_ADDRESS
    ]

    for (let i = 0; i < proxies.length; ++i) {
        const proxy = proxies[i]
        const implementation = await proxyAdmin.getProxyImplementation(proxy);

        console.log(`Verififying ${implementation} for proxy ${proxy} ...`)
        await hre.run("verify:verify", {
            address: implementation,
            constructorArguments: [],
        });
        console.log(`Verified ${implementation}!`)
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
