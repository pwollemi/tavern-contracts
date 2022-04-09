import { ethers } from "hardhat";
import { text } from "stream/consumers";
import { impersonateAccount, sleep } from "../helper/utils";
import { USDC_MAINNET } from "./ADDRESSES";
import { Brewery_address, Mead_address, RedeemHelper_address, RenovationHelper_address, settings_address } from "./NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer,a,b,d,s] = await ethers.getSigners();

    const settings = await ethers.getContractAt("TavernSettings", settings_address);
    const router = await ethers.getContractAt("IJoeRouter02", await settings.dexRouter());
    const mead = await ethers.getContractAt("Mead", Mead_address);

    const interval = 60 * 60;
    const sellAmountPerInterval = 100;
    for(let i = 0; i < 48; ++i) {
        let tx = await router.connect(s).swapExactTokensForTokens(
            ethers.utils.parseUnits('100', 18),
            0,
            [Mead_address, USDC_MAINNET],
            s.address,
            Math.round(Date.now()/1000) + 360
        );
        await tx.wait()
        console.log("Bought tokens!");

        await sleep(interval * 1000);
        console.log("Waited 1 hour!!");
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
