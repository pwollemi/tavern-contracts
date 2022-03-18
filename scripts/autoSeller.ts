import { ethers } from "hardhat";
import { text } from "stream/consumers";
import { impersonateAccount, sleep } from "../helper/utils";
import { USDC_MAINNET } from "./ADDRESSES";
import { Brewery_address, Mead_address, RedeemHelper_address, RenovationHelper_address, settings_address } from "./NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    const router = await ethers.getContractAt("IJoeRouter02", await settings.dexRouter());

    for(let i = 0; i < 8; ++i) {
        let tx = await router.swapTokensForExactTokens(
            ethers.utils.parseUnits("800", 6),
            0, 
            [Mead_address, USDC_MAINNET], 
            deployer.address, 
            Math.round(Date.now()/1000) + 360
        );
        await tx.wait()
        console.log("Bought tokens!");

        await sleep(60 * 60 * 1000);
        console.log("Waited 1 hour!!");
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
