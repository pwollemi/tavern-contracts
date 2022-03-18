/* eslint-disable no-await-in-loop */
import hre, { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import chai from 'chai';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { setNextBlockTimestamp, getLatestBlockTimestamp, mineBlock, latest, impersonateForToken, duration } from "../helper/utils";
import { deployContract, deployProxy } from "../helper/deployer";
import { Brewery, BreweryPurchaseHelper, ClassManager, IERC20, IJoePair, IJoeRouter02, Mead, Renovation, TavernSettings, WhitelistPresale, XMead } from "../typechain";
import { BigNumber } from "ethers";
import { HomekitManager } from "../typechain/HomekitManager";

chai.use(solidity);
const { expect } = chai;

const USDC = {
  address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  holder: "0xbf14db80d9275fb721383a77c00ae180fc40ae98",
  decimals: 6,
  symbol: "USDC",
}

const routerAddress = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const initialSupply = ethers.utils.parseUnits("100000000", 18);

describe('Homekit Manager', () => {
  let preTestSnapshotID: any;

  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let deployer: SignerWithAddress;
  let rewardsPool: SignerWithAddress;
  let redeemPool: SignerWithAddress;
  let minter: SignerWithAddress;
  let tavernsKeep: SignerWithAddress;

  let mead: Mead;
  let xmead: XMead;
  let usdc: IERC20;
  let settings: TavernSettings;
  let classManager: ClassManager;
  let manager: HomekitManager;

  const productionRatePerSecond = ethers.utils.parseUnits("5", 5).div(86400);
  const homekitPrice = ethers.utils.parseUnits("20", 18);
  const walletLimit = 200;

  const thresholds = [0, 100, 200];
  const taxRates = [1000, 500, 200];

  before(async () => {
    preTestSnapshotID = await hre.network.provider.send("evm_snapshot");

    [deployer, minter, alice, bob, rewardsPool, tavernsKeep, redeemPool] = await ethers.getSigners();
    usdc = <IERC20>await ethers.getContractAt("IERC20", USDC.address);
    mead = <Mead>await deployProxy("Mead", routerAddress, USDC.address, tavernsKeep.address, initialSupply);
    await mead.enableTrading();

    xmead = <XMead>await deployContract("XMead");
    classManager = <ClassManager>await deployProxy("ClassManager", thresholds);
    settings = <TavernSettings>await deployProxy("TavernSettings", xmead.address, mead.address, usdc.address, classManager.address, routerAddress, taxRates);

    await settings.setWalletLimit(5);
    await settings.setRewardsPool(rewardsPool.address);
    await settings.setTavernsKeep(tavernsKeep.address);
    await settings.setRedeemPool(redeemPool.address);

    await impersonateForToken(USDC, deployer, "1000000");
    await usdc.transfer(alice.address, ethers.utils.parseUnits("100000", USDC.decimals));
    await usdc.transfer(bob.address, ethers.utils.parseUnits("100000", USDC.decimals));

    await mead.transfer(rewardsPool.address, initialSupply.div(10));
    await mead.transfer(redeemPool.address,  initialSupply.div(10));

    // add MEAD-USDC liquidity to Joe Router
    const dexRouter = <IJoeRouter02>await ethers.getContractAt("IJoeRouter02", routerAddress);
    await mead.approve(dexRouter.address, ethers.constants.MaxUint256);
    await usdc.approve(dexRouter.address, ethers.constants.MaxUint256);
    await dexRouter.addLiquidity(
      mead.address,
      usdc.address,
      ethers.utils.parseUnits("10000", 18),
      ethers.utils.parseUnits("10000", USDC.decimals),
      0,
      0,
      deployer.address,
      (await getLatestBlockTimestamp()) + 1000
    );
  });

  beforeEach(async () => {
    manager = <HomekitManager>await deployProxy("HomekitManager", settings.address, homekitPrice, productionRatePerSecond);
    await manager.setHomekitWalletLimit(walletLimit);

    await mead.connect(rewardsPool).approve(manager.address, ethers.constants.MaxUint256);
    await mead.connect(alice).approve(manager.address, ethers.constants.MaxUint256);
    await mead.connect(bob).approve(manager.address, ethers.constants.MaxUint256);
  });

  it("Purchase with mead; can't exceed limit", async () => {
    await mead.transfer(alice.address, homekitPrice.mul(walletLimit));
    await manager.connect(alice).buyWithMead(5);
    expect((await manager.homekits(alice.address)).count).to.be.equal(5);
    await manager.connect(alice).buyWithMead(walletLimit - 5);
    expect((await manager.homekits(alice.address)).count).to.be.equal(walletLimit);
    expect(await mead.balanceOf(alice.address)).to.be.equal(0);

    await mead.transfer(alice.address, homekitPrice);
    await expect(manager.connect(alice).buyWithMead(1)).to.be.revertedWith("Cant go over wallet limit");
  });

  it("Purchase with LP", async () => {
    const LP = <IJoePair>await ethers.getContractAt("IJoePair", await settings.liquidityPair());
    await LP.connect(alice).approve(manager.address, ethers.constants.MaxUint256);
    await manager.setLPEnabled(true);

    const count = 30;

    const usdcCost = await manager.getUSDCForMead(homekitPrice.mul(count));
    const lpCost = await manager.getLPFromUSDC(usdcCost);
    const discount = await manager.calculateLPDiscount();
    const discountAmount = lpCost.mul(discount).div(1e4);
    const actualCost = lpCost.sub(discountAmount);
    await LP.transfer(alice.address, lpCost);

    const tavern0 = await LP.balanceOf(tavernsKeep.address);
    await manager.connect(alice).buyWithLP(count);
    const tavern1 = await LP.balanceOf(tavernsKeep.address);

    expect(tavern1.sub(tavern0)).to.be.equal(actualCost);
    expect((await manager.homekits(alice.address)).count).to.be.equal(count);
  });

  it("rewards", async () => {
    await mead.transfer(alice.address, homekitPrice.mul(walletLimit));
    await manager.connect(alice).buyWithMead(5);

    let startTime = await getLatestBlockTimestamp();

    let stat = await manager.homekits(alice.address);
    expect(stat.pendingYields).to.be.equal(0);
    expect(stat.lastTimeClaimed).to.be.equal(startTime);
    expect(stat.count).to.be.equal(5);
    expect(await manager.pendingMead(alice.address)).to.be.equal(0);

    let period = 86400;
    await setNextBlockTimestamp(startTime + period);
    await mineBlock();

    let expectedReward = await manager.getMeadforUSDC(stat.count.mul(productionRatePerSecond).mul(period));
    stat = await manager.homekits(alice.address);
    expect(stat.pendingYields).to.be.equal(0);
    expect(stat.lastTimeClaimed).to.be.equal(startTime);
    expect(stat.count).to.be.equal(5);
    expect(await manager.pendingMead(alice.address)).to.be.equal(expectedReward);

    // buy 5 more
    await manager.connect(alice).buyWithMead(5);

    let lastTime = await getLatestBlockTimestamp();

    expectedReward = await manager.getMeadforUSDC(stat.count.mul(productionRatePerSecond).mul(lastTime - startTime));
    stat = await manager.homekits(alice.address);
    expect(stat.pendingYields).to.be.equal(expectedReward);
    expect(stat.lastTimeClaimed).to.be.equal(lastTime);
    expect(stat.count).to.be.equal(10);
    expect(await manager.pendingMead(alice.address)).to.be.equal(expectedReward);

    // claim
    period = 86400;
    await setNextBlockTimestamp(lastTime + period);
    expectedReward = (await manager.getMeadforUSDC(stat.count.mul(productionRatePerSecond).mul(period))).add(stat.pendingYields);

    const claimTax = expectedReward.mul(taxRates[0]).div(10000);
    const userReward = expectedReward.sub(claimTax);

    const aliceMead0 = await mead.balanceOf(alice.address);
    const treasuryMead0 = await mead.balanceOf(tavernsKeep.address);
    const totalYield0 = (await manager.homekits(alice.address)).totalYield;
    await manager.connect(alice).claim();
    const aliceMead1 = await mead.balanceOf(alice.address);
    const treasuryMead1 = await mead.balanceOf(tavernsKeep.address);
    const totalYield1 = (await manager.homekits(alice.address)).totalYield;

    expect(aliceMead1.sub(aliceMead0)).to.be.equal(userReward);
    expect(treasuryMead1.sub(treasuryMead0)).to.be.equal(claimTax);
    expect(totalYield1.sub(totalYield0)).to.be.equal(expectedReward);

    lastTime = await getLatestBlockTimestamp();
    stat = await manager.homekits(alice.address);
    expect(stat.pendingYields).to.be.equal(0);
    expect(stat.lastTimeClaimed).to.be.equal(lastTime);
    expect(stat.count).to.be.equal(10);
    expect(await manager.pendingMead(alice.address)).to.be.equal(0);
  });

  it.only("compound", async () => {
    await mead.transfer(alice.address, homekitPrice.mul(walletLimit));
    await manager.connect(alice).buyWithMead(5);
    let startTime = await getLatestBlockTimestamp();

    let stat = await manager.homekits(alice.address);
    let period = 8640000;
    let expectedReward = await manager.getMeadforUSDC(stat.count.mul(productionRatePerSecond).mul(period));
    await setNextBlockTimestamp(startTime + period);

    const rewardAmount = expectedReward.sub(homekitPrice);
    const claimTax = rewardAmount.mul(taxRates[0]).div(10000);
    const userReward = rewardAmount.sub(claimTax);
    const treasuryFee = homekitPrice.mul(await settings.treasuryFee()).div(10000);

    const aliceMead0 = await mead.balanceOf(alice.address);
    const treasuryMead0 = await mead.balanceOf(tavernsKeep.address);
    await manager.connect(alice).compound(1);
    const aliceMead1 = await mead.balanceOf(alice.address);
    const treasuryMead1 = await mead.balanceOf(tavernsKeep.address);

    expect(aliceMead1.sub(aliceMead0)).to.be.equal(userReward);
    expect(treasuryMead1.sub(treasuryMead0)).to.be.equal(claimTax.add(treasuryFee));

    stat = await manager.homekits(alice.address);
    expect(stat.pendingYields).to.be.equal(0);
    expect(stat.lastTimeClaimed).to.be.equal(startTime + period);
    expect(stat.count).to.be.equal(6);
    expect(await manager.pendingMead(alice.address)).to.be.equal(0);
  });

  after(async () => {
    await hre.network.provider.send("evm_revert", [preTestSnapshotID]);
  });
});
