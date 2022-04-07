import { ethers } from "hardhat";
import { TreasuryAddress, USDC_MAINNET } from "../ADDRESSES";
import ERC20 from '../../abis/ERC20.json';
import { BreweryHelper_address, Brewery_address, ClassManager_address, Mead_address, RedeemHelper_address, settings_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, alice, bob] = await ethers.getSigners();

    console.log("Deployer Address", deployer.address);
    console.log("AVAX", ethers.utils.formatEther(await deployer.getBalance()));
    const mead = await ethers.getContractAt("Mead", Mead_address);
    const usdc = await ethers.getContractAt(ERC20, USDC_MAINNET)
    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    const lp = await ethers.getContractAt("IJoePair", await settings.liquidityPair())
    const router = await ethers.getContractAt("IJoeRouter02", await settings.dexRouter());
    const factory = await ethers.getContractAt("IJoeFactory", await router.factory());
    const redeemer = await ethers.getContractAt("xMeadRedeemHelper", RedeemHelper_address)
    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address)
    const BreweryHelper = await ethers.getContractAt("BreweryPurchaseHelper", '0xA3d66fa0140260217F7781793CcDE3b030B58258');

    const payment = [
        ["0x145d729EAe53DEA212cE970558D6Eb1846D15d20", 10000],   // Zandro
        ["0x0b7Aa713C1c62423F60e97a926528f7987b2716B", 6500],    // Arc
        ["0xCfF3d83b7176F92fD2DE4CbA8CfE2241eA7eF374", 2000],    // Haynes
        ["0x4bd9798972587b604B0eA35940A78AEb9f631059", 2000],    // Welshy
        ["0x6200DC915D5Ab2cC704276675f0878fB952B3f49", 2000],    // Martin
        ["0x190b01574468B639e9b63E21b96E8444008F01d7", 1000],    // Tom
        //["0xde94C4841C9D4Ecd8D1DF5b8BEC8170044F1fA58", 500],   // Jay
    ]

    const txCount = await deployer.getTransactionCount();
    for (let i = 0; i < payment.length; ++i) {
        const person = payment[i][0];
        const amount = payment[i][1].toString();
        await usdc.transfer(person, ethers.utils.parseUnits(amount, 6), { nonce: txCount + i});
    }


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
