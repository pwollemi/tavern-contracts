import { ethers, upgrades } from "hardhat";
import { TRADERJOE_ROUTER_MAINNET, USDC_MAINNET } from "../ADDRESSES";
import { Brewery_address, ClassManager_address, Mead_address, RedeemHelper_address, settings_address, xMead_address } from "../NFT_ADDRESSES";

import ERC20 from "../../abis/ERC20.json"
import { deployProxy } from "../../helper/deployer";
import { impersonateAccount, impersonateForToken } from "../../helper/utils";
import { TransparentUpgradeableProxy } from "../../typechain";

const USDC = {
    address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    holder: "0xbf14db80d9275fb721383a77c00ae180fc40ae98",
    decimals: 6,
    symbol: "USDC",
}

const MEAD = {
    address: Mead_address,
    holder: "0xf0D41ED017dB1eBA5f58E705681c2f312BfAc5AC",
    decimals: 18,
    symbol: "MEAD",
}



async function main() {
    // The signers
    const [deployer, alice, bob] = await ethers.getSigners();

    let tx;

    console.log("Deployer Address", deployer.address);
    console.log("AVAX", ethers.utils.formatEther(await deployer.getBalance()));
    const mead = await ethers.getContractAt("Mead", Mead_address);
    const brewery = await ethers.getContractAt("Brewery", Brewery_address);
    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    const router = await ethers.getContractAt("IJoeRouter02", await settings.dexRouter());
    const factory = await ethers.getContractAt("IJoeFactory", await router.factory());
    const redeemer = await ethers.getContractAt("xMeadRedeemHelper", RedeemHelper_address)
    const usdc = await ethers.getContractAt(ERC20, USDC_MAINNET);
    const marketplace = await ethers.getContractAt("TavernEscrowTrader", '0xe4216bc0B9B2d87990918b90bA77949Af121f2b6')

    await impersonateForToken(USDC, deployer, "1000000");
    await usdc.transfer(alice.address, ethers.utils.parseUnits("100000", USDC.decimals));
    await usdc.transfer(bob.address, ethers.utils.parseUnits("100000", USDC.decimals));
    await impersonateForToken(MEAD, deployer, "2000");
    await mead.transfer(alice.address, ethers.utils.parseEther("500"));
    await mead.transfer(bob.address, ethers.utils.parseEther("500"));

    await impersonateAccount("0xf0D41ED017dB1eBA5f58E705681c2f312BfAc5AC");
    const signer = await ethers.getSigner("0xf0D41ED017dB1eBA5f58E705681c2f312BfAc5AC");

    for (let index = 0; index < 15; index++) {
        let tx = await brewery.connect(signer).mint(signer.address, "test");
        let result = tx.wait();
        let event = (await result).events.find(e => e.event === "Transfer");
        let aliceTokenId = event.args.tokenId;
        await brewery.connect(signer).approve(marketplace.address, aliceTokenId);
        await marketplace.connect(signer).createOrder(aliceTokenId, ethers.utils.parseEther((50 + index).toString()));
    }


    // Check balances
    const meadBalance = await mead.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("Mead Balance", ethers.utils.formatUnits(meadBalance, 18));
    console.log("USDC Balance", ethers.utils.formatUnits(usdcBalance, 6));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });