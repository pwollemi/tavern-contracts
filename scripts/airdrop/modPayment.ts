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
        ['0x61d6d2Bc571f734F7C22275922c22a91E81FbCd7', 125], // Space Gnome
        ['0x0060FF0E4dcFFC65581FC56C3538f2212A745a22', 125], // Cryptomonkeyz
        ['0xA8E05d8683142E99e6179371e80D2663D35a4c2d', 125], // Burner
        ['0x4c890Dc20f7D99D0135396A08d07d1518a45a1DD', 100], // Sol Kampbell
        ['0xEFC38CF296E997F37Cb9a1C8bf852838110344D9', 100], // Saga
        ['0x4758392160477Fc931eC1C69d5840b720D387FB9', 100], // Bar Wench
        ['0x822e99436a14A562eE6b1ca4cdC07466C9D20FCf', 100], // Volt
        ['0xF96be821f8519c41B4d59Fcd76948A1c0c5Bd885', 100], // Zeecool
        ['0xD26d652E4aCBdBDF7EE5295a33654271A220d268', 100], // Redknife529
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
