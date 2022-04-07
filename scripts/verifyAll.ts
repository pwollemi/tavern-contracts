import hre, { ethers, upgrades } from "hardhat";

import ProxyAdmin from './ProxyAdmin.json';

async function main() {
    const [deployer] = await ethers.getSigners();
    
    const proxyAdmin = await ethers.getContractAt(ProxyAdmin, '0x0B69b4A89991ad8175a642eF00BddDD0689b4754');

    let proxies = [
        '0xD21CdCA47Fa45A0A51eec030E27AF390ab3aa489', // Mead
        '0xf5E723f0FD54f8c75f0Da8A8F9D68Bf67B20b850', // Brewery
        '0x45683E8b503C85447e782c98Fd54234cd9a3B621', // Renovations
        '0x8f90f0eb59950692ea6a87bea260908ed3a4a38f', // Settings
        '0xFcEc013268e2C0ed277367991DFa25F646E4E987', // Class Manager
        '0x2f54fc9EF1B3a0259cC8DC5B1047edC2670F460E', // Redeem Helper
        '0x600A37198Aad072DA06E061a9cbBa09CAEeCFc2A', // Brewery Purchase Helper
        '0xcE5754CE78EbeDDF2a3988c701c5BeFf3Ee673BA', // Renovation Purchase Helper
        '0xC46B6D27091A79552F7F6B64c94c8A57C21F5bcb', // Homekit Manager
        '0x94D9045DC99cbc96311E1520F47d67Eb62a0CF8a', // Staking
    ]

    for (let i = 0; i < proxies.length; ++i) {
        const proxy = proxies[i]
        const implementation = await proxyAdmin.getProxyImplementation(proxy);

        console.log(`Verififying ${implementation} for proxy ${proxy} ...`)
        await hre.run("verify:verify", {
            address: implementation,
            constructorArguments: [],
        })
        .then(r => console.log(`Verified ${implementation}!`))
        .catch(r => console.log(`Already verified!`))
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
