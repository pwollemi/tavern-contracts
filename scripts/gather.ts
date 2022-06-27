import { BigNumber } from "ethers";
import fs from "fs";
import hre, { ethers } from "hardhat";
import { getLatestBlockTimestamp } from "../helper/utils";
import { Brewery, BreweryPurchaseHelper, ClassManager, TavernStaking } from "../typechain";

async function gatherStaking() {
    const staking = <TavernStaking>await ethers.getContractAt("TavernStaking", "0x94d9045dc99cbc96311e1520f47d67eb62a0cf8a");
    const depositFilter = staking.filters.Deposit();
    const emegerncyWithdrawFilter = staking.filters.EmergencyWithdraw();
    const withdrawFilter = staking.filters.Withdraw();

    const startBlock = 12188505;
    const endBlock = 12738574;
    const stakers = {};
    for (let i = startBlock; i < endBlock; i += 1000) {
        console.log(i, "~", i + 1000);
        const toBlock = (i + 1000) > endBlock ? endBlock : (i + 1000); 
        const deposits = await staking.queryFilter(depositFilter, i, toBlock);
        const ewithdraws = await staking.queryFilter(emegerncyWithdrawFilter, i, toBlock);
        const withdraws = await staking.queryFilter(withdrawFilter, i, toBlock);
        deposits.forEach((d) => {
            if (!stakers[d.args.user]) {
                stakers[d.args.user] = d.args.amount.toString();
            } else {
                stakers[d.args.user] = BigNumber.from(stakers[d.args.user]).add(d.args.amount).toString();
            }
        });
        ewithdraws.forEach((d) => {
            stakers[d.args.user] = BigNumber.from(stakers[d.args.user]).sub(d.args.amount).toString();
        });
        withdraws.forEach((d) => {
            stakers[d.args.user] = BigNumber.from(stakers[d.args.user]).sub(d.args.amount).toString();
        })
    }
    fs.writeFileSync("stakers.json", JSON.stringify(stakers));
}

async function gatherPurchase() {
    const purchaser = <BreweryPurchaseHelper>await ethers.getContractAt("BreweryPurchaseHelper", "0x600A37198Aad072DA06E061a9cbBa09CAEeCFc2A");
    const brewery = <Brewery>await ethers.getContractAt("Brewery", "0xf5E723f0FD54f8c75f0Da8A8F9D68Bf67B20b850");

    const mintFilter = brewery.filters.Transfer(ethers.constants.AddressZero);

    const startBlock = 12742237;
    const endBlock = 12822853;
    let purchasers = {};
    for (let i = startBlock; i < endBlock; ) {
        console.log(i, "~", i + 1000);
        const purchaserBefore = purchasers;
        try {
            const toBlock = (i + 1000) > endBlock ? endBlock : (i + 1000); 
            const mints = await brewery.queryFilter(mintFilter, i, toBlock);
    
            mints.forEach(async (d) => {
                const tx = await d.getTransaction();
                const receipt = await d.getTransactionReceipt();
                if (receipt.to != "0x600A37198Aad072DA06E061a9cbBa09CAEeCFc2A") {
                    return;
                }
    
                try {
                    const res = purchaser.interface.decodeFunctionData("purchaseWithLP(uint256)", tx.data);
                    purchasers[tx.from] = (purchasers[tx.from] || 0) + 1;
                    console.log(tx.hash, "purchaseWithLP");
                } catch {}
                try {
                    const res = purchaser.interface.decodeFunctionData("purchaseWithLPUsingZap(uint256)", tx.data);
                    purchasers[tx.from] = (purchasers[tx.from] || 0) + 1;
                    console.log(tx.hash, "purchaseWithLPUsingZap");
                } catch {}
                try {
                    const res = purchaser.interface.decodeFunctionData("convertStakeIntoBrewerys(uint256)", tx.data);
                    purchasers[tx.from] = (purchasers[tx.from] || 0) + 1;
                    console.log(tx.hash, "convertStakeIntoBrewerys");
                } catch {}
            });
            i += 1000;
        } catch {
            console.log("retry after 10 seconds");
            purchasers = purchaserBefore;
            await new Promise((resolve) => setTimeout(resolve, 10000));
        }
    }
    fs.writeFileSync("purchasers.json", JSON.stringify(purchasers));
}

async function gatherCompound() {
    const brewery = <Brewery>await ethers.getContractAt("Brewery", "0xf5E723f0FD54f8c75f0Da8A8F9D68Bf67B20b850");

    const mintFilter = brewery.filters.Transfer(ethers.constants.AddressZero);

    const startBlock = 11687910;
    const endBlock = 12861643;
    let compounders = {};
    for (let i = startBlock; i < endBlock; ) {
        console.log(i, "~", i + 1000);
        const compoundersBefore = compounders;
        try {
            const toBlock = (i + 1000) > endBlock ? endBlock : (i + 1000); 
            const mints = await brewery.queryFilter(mintFilter, i, toBlock);
    
            mints.forEach(async (d) => {
                const tx = await d.getTransaction();
                const receipt = await d.getTransactionReceipt();
                if (receipt.to != "0xf5E723f0FD54f8c75f0Da8A8F9D68Bf67B20b850") {
                    return;
                }
            
                try {
                    const res = brewery.interface.decodeFunctionData("compoundAll()", tx.data);
                    compounders[tx.from] = (compounders[tx.from] || 0) + 1;
                    console.log(tx.hash, "compoundAll");
                } catch {}
                try {
                    const res = brewery.interface.decodeFunctionData("compound(uint256)", tx.data);
                    compounders[tx.from] = (compounders[tx.from] || 0) + 1;
                    console.log(tx.hash, "compound");
                } catch {}
            });
            i += 1000;
        } catch {
            console.log("retry after 10 seconds");
            compounders = compoundersBefore;
            await new Promise((resolve) => setTimeout(resolve, 10000));
        }
    }
    fs.writeFileSync("compounders.json", JSON.stringify(compounders));
}

async function main() {
    // await gatherCompound();
    const classManager = <ClassManager>await ethers.getContractAt("ClassManager", "0xFcEc013268e2C0ed277367991DFa25F646E4E987");
    const brewery = <Brewery>await ethers.getContractAt("Brewery", "0xf5E723f0FD54f8c75f0Da8A8F9D68Bf67B20b850");

    // console.log((await brewery.tiers(0)).toString());
    // console.log((await brewery.tiers(1)).toString());
    // console.log((await brewery.tiers(2)).toString());

    // const blockTag = 13418480;
    // const tokenId = 16672;
    const blockTag = 13418194;
    const tokenId = 16673;
    // const blockTag = 13418551;
    // const tokenId = 9121;
    // const tier0 = await brewery.getTier(tokenId, { blockTag: blockTag - 100});
    // const xp0 = (await brewery.breweryStats(tokenId, { blockTag: blockTag - 100})).xp;
    // const tier1 = await brewery.getTier(tokenId, {
    //     blockTag: blockTag + 2
    // });
    // const xp1 = (await brewery.breweryStats(tokenId, { blockTag: blockTag + 2})).xp;
    // const tier = await brewery.getTier(tokenId);
    // const xp = (await brewery.breweryStats(tokenId)).xp;
    // console.log(tier0.toString());
    // console.log(tier1.toString());
    // console.log(tier.toString());
    // console.log(xp0.toString());
    // console.log(xp1.toString());
    // console.log(xp.toString());

    const fermentationPeriod = await brewery.getFermentationPeriod(tokenId);
    const startTime = await brewery.startTime();
    const breweryStat = await brewery.breweryStats(tokenId);
    const xpPerSec = await brewery.getExperiencePerSecond(tokenId);

    const xpStartTime = breweryStat.lastTimeClaimed;
    const fermentationTime = xpStartTime.add(fermentationPeriod);
    const blockTimestamp = await getLatestBlockTimestamp();

    const xp = (blockTimestamp - fermentationTime.toNumber()) * xpPerSec.toNumber();
    console.log(xp);
    console.log((await brewery.getPendingXp(tokenId)).toString());

    console.log("sta", xpStartTime.toNumber());
    console.log("per", fermentationPeriod.toNumber());
    console.log("now", blockTimestamp);
    console.log("fer", fermentationTime.toNumber());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });