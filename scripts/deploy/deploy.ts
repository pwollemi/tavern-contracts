import { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import { dateString } from "../../helper/utils";
import { TRADERJOE_ROUTER_MAINNET, TreasuryAddress, USDC_MAINNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { writeFileSync } from "fs";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    // const Brewery = await ethers.getContractAt("Brewery", "0x8EAbD3FC766EA99fD8383B8Fdf79E751dB3E3f4d");


    // Settings
    const routerAddress       = TRADERJOE_ROUTER_MAINNET;
    const usdcAddress         = USDC_MAINNET;
    const initialSupply       = ethers.utils.parseUnits("2500000", 18);                    // 2,500,000
    const fermentationPeriod  = (14 * 86400).toString();                   //         14 days in seconds
    const experiencePerSecond = "1";                                       //         1

    // Dependants: 
    // const xMead = await deployContract("XMead");
    // console.log("xMead", xMead.address);
    // const xMead = await ethers.getContractAt("XMead", "0xfb69818be1d509707007c6ab1cd8b91980d3c971");

    // // Dependants: address _routerAddress, address _usdcAddress, address _tavernsKeep, uint256 _initialSupply
    // const Mead = await deployProxy("Mead", routerAddress, usdcAddress, deployer.address, initialSupply);
    // console.log("Mead", Mead.address);

    // // Dependants: 
    // const ClassManager = await deployProxy("ClassManager", ["0", "50", "500", "2500"]);
    // console.log("ClassManager", ClassManager.address);

    // // Dependants: 
    // //   address _xmead, 
    // //   address _mead, 
    // //   address _usdc, 
    // //   address _classManager,
    // //   address _routerAddress
    // const taxes = ['1800', '1600', '1400', '1200']; // 18%, 16%, 14%, 12%
    // const settings = await deployProxy("TavernSettings", xMead.address, Mead.address, usdcAddress, ClassManager.address, routerAddress, taxes);
    // console.log("settings", settings.address);


    const Mead = await ethers.getContractAt("Mead", "0xD21CdCA47Fa45A0A51eec030E27AF390ab3aa489");

    const settings = await ethers.getContractAt("TavernSettings", "0x8f90f0eB59950692eA6A87bEA260908eD3a4a38F")
    
    // Configure settings
    // await settings.setTavernsKeep(TreasuryAddress);
    // await settings.setRewardsPool(deployer.address);
    // await settings.setTreasuryFee(ethers.utils.parseUnits("30", 2));
    // await settings.setRewardPoolFee(ethers.utils.parseUnits("70", 2));
    // await settings.setTxLimit("5");
    // await settings.setWalletLimit("20");
    // await settings.setBreweryCost(ethers.utils.parseUnits("100", 18));
    // await settings.setXMeadCost(ethers.utils.parseUnits("90", 18));

    // Dependants:
    //   address _tavernSettings,
    //   uint256 _fermentationPeriod,
    //   uint256 _experiencePerSecond
    //const Brewery = await deployProxy("Brewery", settings.address, fermentationPeriod, experiencePerSecond);
    const Brewery = await ethers.getContractAt("Brewery", "0xf5E723f0FD54f8c75f0Da8A8F9D68Bf67B20b850")
    console.log("Brewery", Brewery.address);

    // Configure brewery
    await Brewery.setBaseURI("https://ipfs.tavern.money/ipfs/QmSJDwZxDArzBkZPxPjswj7ZYzx8KUEX1Do9cbnSaSwzm5")
    await Brewery.setTokenURI(0, 0, "/type/0/tier/0.json")
    let tx = await Brewery.setTokenURI(0, 1, "/type/0/tier/1.json")
    await tx.wait();
    
    tx = await Brewery.setTokenURI(0, 2, "/type/0/tier/2.json")
    await tx.wait();

    tx = await Brewery.setTokenURI(4, 0, "/type/4/tier/0.json")
    await tx.wait();

    tx = await Brewery.setTokenURI(4, 1, "/type/4/tier/1.json")
    await tx.wait();

    tx = await Brewery.setTokenURI(4, 2, "/type/4/tier/2.json")
    await tx.wait();

    tx = await Brewery.addTier("0", ethers.utils.parseUnits("2", await Mead.decimals()));
    await tx.wait();

    tx = await Brewery.addTier("1209600", ethers.utils.parseUnits("3", await Mead.decimals()));
    await tx.wait();

    tx = await Brewery.addTier("3628800", ethers.utils.parseUnits("4", await Mead.decimals()));
    await tx.wait();

    // Setup renovation
    const Renovation = await deployProxy("Renovation", Brewery.address);
    console.log("Renovation: ", Renovation.address);
    await settings.setRenovationAddress(Renovation.address);

    // Mint our first brewery (id: 1)
    await Brewery.mint(deployer.address, "First!");
    console.log("Minted first BREWERY!")

    // Auto export
//     const file = `// ${dateString(Date.now())}
// export const xMead_address = '${xMead.address}';
// export const Mead_address = '${Mead.address}';
// export const ClassManager_address = '${ClassManager.address}';
// export const settings_address = '${settings.address}';
// export const Brewery_address = '${Brewery.address}';
// export const renovation_address = '${Renovation.address}';`;

//     writeFileSync("./scripts/NFT_ADDRESSES.ts", file);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
