/* eslint-disable no-await-in-loop */
import hre, { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import chai from 'chai';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { setNextBlockTimestamp, getLatestBlockTimestamp, mineBlock, latest, impersonateForToken, duration, getLatestBlockNumber, mineBlocks } from "../helper/utils";
import { deployContract, deployProxy } from "../helper/deployer";
import { Brewery, BreweryPurchaseHelper, ClassManager, IERC20, IJoeFactory, IJoePair, IJoePair__factory, IJoeRouter02, Mead, Renovation, TavernSettings, TavernStaking, WhitelistPresale, XMead } from "../typechain";
import { BigNumber } from "ethers";

chai.use(solidity);
const { expect } = chai;

const USDC = {
  address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  holder: "0xbf14db80d9275fb721383a77c00ae180fc40ae98",
  decimals: 6,
  symbol: "USDC",
}

const routerAddress = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const factoryAddress = "0x9ad6c38be94206ca50bb0d90783181662f0cfa10";
const initialSupply = ethers.utils.parseUnits("100000000", 18);

describe('Brewery Purchase Helper', () => {
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
  let brewery: Brewery;
  let renovation: Renovation;
  let settings: TavernSettings;
  let classManager: ClassManager;
  let purchaser: BreweryPurchaseHelper;
  let staking: TavernStaking;

  const baseDailyYield = ethers.utils.parseUnits("2", 18);
  const baseFermentationPeriod = duration.days(14).toNumber();
  // in 1 day, it increases 10 XP, accuracy is PRECISION
  const baseExperiencePerSecond = 1157407;
  const tiers = [0, 99, 249];
  // production rate multipliers
  const yields = [
    ethers.utils.parseUnits("1", 18),
    ethers.utils.parseUnits("2", 18),
    ethers.utils.parseUnits("3", 18)
  ];
  const thresholds = [0, 100, 200];
  const taxRates = [1000, 500, 200];

  const walletLimit = 5;

  before(async () => {
    preTestSnapshotID = await hre.network.provider.send("evm_snapshot");

    [deployer, minter, alice, bob, rewardsPool, tavernsKeep, redeemPool] = await ethers.getSigners();
    usdc = <IERC20>await ethers.getContractAt("IERC20", USDC.address);
    mead = <Mead>await deployProxy("Mead", routerAddress, USDC.address, tavernsKeep.address, initialSupply);
    await mead.enableTrading();

    xmead = <XMead>await deployContract("XMead");

    classManager = <ClassManager>await deployProxy("ClassManager", thresholds);
    settings = <TavernSettings>await deployProxy("TavernSettings", xmead.address, mead.address, usdc.address, classManager.address, routerAddress, taxRates);

    await settings.setWalletLimit(walletLimit);
    await settings.setRewardsPool(rewardsPool.address);
    await settings.setTavernsKeep(tavernsKeep.address);
    await settings.setRedeemPool(redeemPool.address);
    await settings.setTxLimit(walletLimit);

    await impersonateForToken(USDC, deployer, "1000000");
    await usdc.transfer(alice.address, ethers.utils.parseUnits("100000", USDC.decimals));
    await usdc.transfer(bob.address, ethers.utils.parseUnits("100000", USDC.decimals));

    await mead.transfer(rewardsPool.address, initialSupply.div(10));
    await mead.transfer(redeemPool.address,  initialSupply.div(10));

    await xmead.grantRole(await xmead.ISSUER_ROLE(), deployer.address);

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
      (await getLatestBlockTimestamp()) + 1
    );
  });

  beforeEach(async () => {
    brewery = <Brewery>await deployProxy("Brewery", settings.address, baseFermentationPeriod, baseExperiencePerSecond);
    renovation = <Renovation>await deployProxy("Renovation", brewery.address);
    purchaser = <BreweryPurchaseHelper>await deployProxy("BreweryPurchaseHelper", settings.address, brewery.address);

    await brewery.grantRole(await brewery.MINTER_ROLE(), minter.address);
    await brewery.grantRole(await brewery.MINTER_ROLE(), purchaser.address);
    await xmead.grantRole(await xmead.REDEEMER_ROLE(), purchaser.address);
    await classManager.grantRole(await classManager.MANAGER_ROLE(), purchaser.address);

    await mead.connect(rewardsPool).approve(brewery.address, ethers.constants.MaxUint256);
    await mead.connect(redeemPool).approve(purchaser.address, ethers.constants.MaxUint256);

    await brewery.addTier(tiers[0], yields[0]);
    await brewery.addTier(tiers[1], yields[1]);
    await brewery.addTier(tiers[2], yields[2]);
    await brewery.setMaxBreweries(100000);
  });

  it("Purchase with XMead", async () => {
    const xMeadCost = await settings.xMeadCost();
    await xmead.issue(alice.address, xMeadCost);

    await purchaser.connect(alice).purchaseWithXMead(1);
    expect(await brewery.balanceOf(alice.address)).to.be.equal(1);
    expect(await xmead.balanceOf(alice.address)).to.be.equal(0);
  });

  it("Purchase with mead", async () => {
    const meadCost = await settings.breweryCost();
    await mead.transfer(alice.address, meadCost);
    await mead.connect(alice).approve(purchaser.address, ethers.constants.MaxUint256);

    await purchaser.connect(alice).purchaseWithMead(1);
    expect(await brewery.balanceOf(alice.address)).to.be.equal(1);
    expect(await mead.balanceOf(alice.address)).to.be.equal(0);
  });

  it("Purchase with usdc", async () => {
    await usdc.connect(alice).approve(purchaser.address, ethers.constants.MaxUint256);
    await purchaser.setUSDCEnabled(true);

    const discount = await purchaser.usdcDiscount();
    const usdcCost = await purchaser.getUSDCForMead(await settings.breweryCost());
    const actualPercentage = BigNumber.from(1e4).sub(discount);
    const actualCost = usdcCost.mul(actualPercentage).div(1e4);

    const tavern0 = await usdc.balanceOf(tavernsKeep.address);
    await purchaser.connect(alice).purchaseWithUSDC(1);
    const tavern1 = await usdc.balanceOf(tavernsKeep.address);

    expect(tavern1.sub(tavern0)).to.be.equal(actualCost);
    expect(await brewery.balanceOf(alice.address)).to.be.equal(1);
  });

  it("Purchase with LP", async () => {
    const LP = <IJoePair>await ethers.getContractAt("IJoePair", await settings.liquidityPair());
    await LP.connect(alice).approve(purchaser.address, ethers.constants.MaxUint256);
    await purchaser.setLPEnabled(true);

    const usdcCost = await purchaser.getUSDCForMead(await settings.breweryCost());
    const lpCost = await purchaser.getLPFromUSDC(usdcCost);
    const discount = await purchaser.calculateLPDiscount();
    const actualPercentage = BigNumber.from(1e4).sub(discount);
    const actualCost = lpCost.mul(actualPercentage).div(1e4);
    await LP.transfer(alice.address, lpCost);

    const tavern0 = await LP.balanceOf(tavernsKeep.address);
    await purchaser.connect(alice).purchaseWithLP(1);
    const tavern1 = await LP.balanceOf(tavernsKeep.address);

    expect(tavern1.sub(tavern0)).to.be.equal(actualCost);
    expect(await brewery.balanceOf(alice.address)).to.be.equal(1);
  });

  // it("Purchase with LP Zap", async () => {
  //   await usdc.connect(alice).approve(purchaser.address, ethers.constants.MaxUint256);
  //   await purchaser.setUSDCEnabled(true);

  //   const discount = await purchaser.usdcDiscount();
  //   const usdcCost = await purchaser.getUSDCForMead(await settings.breweryCost());
  //   const actualPercentage = BigNumber.from(1e4).sub(discount);
  //   const actualCost = usdcCost.mul(actualPercentage).div(1e4);

  //   const tavern0 = await usdc.balanceOf(tavernsKeep.address);
  //   await purchaser.connect(alice).purchaseWithLPUsingZap(1);
  //   const tavern1 = await usdc.balanceOf(tavernsKeep.address);

  //   expect(tavern1.sub(tavern0)).to.be.equal(actualCost);
  //   expect(await brewery.balanceOf(alice.address)).to.be.equal(1);
  // });

  it("Convert staking lp into brewery", async () => {
    const LP = <IJoePair>await ethers.getContractAt("IJoePair", await settings.liquidityPair());
    await LP.connect(alice).approve(purchaser.address, ethers.constants.MaxUint256);
    await purchaser.setLPEnabled(true);

    // prepare staking
    const latestBlockNumber = await getLatestBlockNumber();
    staking = <TavernStaking>await deployProxy(
      "TavernStaking",
      mead.address,
      LP.address,
      10,
      latestBlockNumber,
      latestBlockNumber + 100000000,
      0,
      0
    );
    await staking.setSettings(settings.address);
    await classManager.grantRole(await classManager.MANAGER_ROLE(), staking.address);
    await mead.transfer(staking.address, initialSupply.div(10));
    await LP.connect(alice).approve(staking.address, ethers.constants.MaxUint256);

    const usdcCost = await purchaser.getUSDCForMead(await settings.breweryCost());
    const lpCost = await purchaser.getLPFromUSDC(usdcCost);
    const discount = await purchaser.calculateLPDiscount();
    const actualPercentage = BigNumber.from(1e4).sub(discount);
    const actualCost = lpCost.mul(actualPercentage).div(1e4);
    await LP.transfer(alice.address, lpCost);

    await staking.connect(alice).deposit(lpCost);

    const tavern0 = await LP.balanceOf(tavernsKeep.address);
    await purchaser.connect(alice).convertStakeIntoBrewerys(staking.address, lpCost);
    const tavern1 = await LP.balanceOf(tavernsKeep.address);

    expect(tavern1.sub(tavern0)).to.be.equal(actualCost);
    expect(await brewery.balanceOf(alice.address)).to.be.equal(1);
  });


  it("Convert pending meads into brewery", async () => {
    const LP = <IJoePair>await ethers.getContractAt("IJoePair", await settings.liquidityPair());
    await LP.connect(alice).approve(purchaser.address, ethers.constants.MaxUint256);
    await purchaser.setLPEnabled(true);

    // prepare staking
    const latestBlockNumber = await getLatestBlockNumber();
    const rewardPerBlock = 1000000000000000;
    staking = <TavernStaking>await deployProxy(
      "TavernStaking",
      mead.address,
      LP.address,
      rewardPerBlock,
      latestBlockNumber,
      latestBlockNumber + 100000000,
      0,
      0
    );
    await staking.setSettings(settings.address);
    await classManager.grantRole(await classManager.MANAGER_ROLE(), staking.address);

    await mead.transfer(staking.address, initialSupply.div(10));
    await mead.connect(alice).approve(purchaser.address, ethers.constants.MaxUint256);
    await LP.transfer(alice.address, await LP.balanceOf(deployer.address));
    await LP.connect(alice).approve(staking.address, ethers.constants.MaxUint256);
    await staking.connect(alice).deposit(await LP.balanceOf(alice.address));
    await mineBlocks(10000000);

    const discount = await purchaser.conversionDiscount();
    const meadCost = await settings.breweryCost();
    const actualCost = meadCost.sub(meadCost.mul(discount).div(1e4));

    const rewardAmount = (await staking.pendingRewards(alice.address)).add(rewardPerBlock);

    let expectedCount = rewardAmount.div(actualCost).toNumber();
    if (expectedCount > walletLimit) {
      expectedCount = walletLimit;
    }
    const claimedFund = rewardAmount.sub(actualCost.mul(expectedCount));

    const alice0 = await mead.balanceOf(alice.address);
    await purchaser.connect(alice).compoundPendingStakeRewardsIntoBrewerys(staking.address);
    const alice1 = await mead.balanceOf(alice.address);
    
    // expect(alice1.sub(alice0)).to.be.equal(claimedFund);
    expect(await brewery.balanceOf(alice.address)).to.be.equal(expectedCount);

    console.log("Compounded", expectedCount, "breweries from", rewardAmount.toString(), "Meads");
    console.log(claimedFund.toString(), "Meads are claimed to wallet");
  });

  after(async () => {
    await hre.network.provider.send("evm_revert", [preTestSnapshotID]);
  });
});
