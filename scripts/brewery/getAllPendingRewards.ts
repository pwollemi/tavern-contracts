

import { ethers } from "hardhat";
import { dateString } from "../../helper/utils";
import { Brewery_address, ClassManager_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer] = await ethers.getSigners();

    const ClassManager = await ethers.getContractAt("ClassManager", ClassManager_address);
    const Brewery = await ethers.getContractAt("Brewery", Brewery_address);

    const total = Number((await Brewery.totalSupply()).toString())
    console.log("Total Supply", total);

    let totalPending = 0;
    let pendings = []
    for (let i = 0; i < total; ++i) {
        let p = await Brewery.pendingMead(i);
        totalPending += Number(ethers.utils.formatUnits(p, 18))
    }
    // await Promise.all(pendings);

    // for(const pending in pendings) {
    //     totalPending += Number(ethers.utils.formatUnits(pending, 18))
    // }

    console.log("Total", totalPending)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
