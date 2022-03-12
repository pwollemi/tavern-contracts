/* eslint-disable no-await-in-loop */
import hre, { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import chai from 'chai';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { setNextBlockTimestamp, getLatestBlockTimestamp, mineBlock, latest, impersonateForToken, duration } from "../helper/utils";
import { deployContract, deployProxy } from "../helper/deployer";
import { Brewery, ClassManager, IERC20, Mead, Renovation, TavernSettings, WhitelistPresale, XMead } from "../typechain";

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

describe('Brewery', () => {
  let preTestSnapshotID: any;

  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let deployer: SignerWithAddress;
  let rewardsPool: SignerWithAddress;
  let minter: SignerWithAddress;
  let tavernsKeep: SignerWithAddress;

  let mead: Mead;
  let xmead: XMead;
  let usdc: IERC20;
  let brewery: Brewery;
  let renovation: Renovation;
  let settings: TavernSettings;
  let classManager: ClassManager;

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

    [deployer, minter, alice, bob, rewardsPool, tavernsKeep] = await ethers.getSigners();
    usdc = <IERC20>await ethers.getContractAt("IERC20", USDC.address);
    mead = <Mead>await deployProxy("Mead", routerAddress, USDC.address, tavernsKeep.address, initialSupply);
    await mead.enableTrading();

    xmead = <XMead>await deployContract("XMead");
    classManager = <ClassManager>await deployProxy("ClassManager", thresholds);
    settings = <TavernSettings>await deployProxy("TavernSettings", xmead.address, mead.address, usdc.address, classManager.address, routerAddress, taxRates);

    await settings.setWalletLimit(walletLimit);
    await settings.setRewardsPool(rewardsPool.address);
    await settings.setTavernsKeep(tavernsKeep.address);

    await impersonateForToken(USDC, deployer, "1000000");
    await usdc.transfer(alice.address, ethers.utils.parseUnits("100000", USDC.decimals));
    await usdc.transfer(bob.address, ethers.utils.parseUnits("100000", USDC.decimals));

    await mead.transfer(rewardsPool.address, initialSupply.div(10));
  });

  beforeEach(async () => {
    brewery = <Brewery>await deployProxy("Brewery", settings.address, baseFermentationPeriod, baseExperiencePerSecond);
    renovation = <Renovation>await deployProxy("Renovation", brewery.address);

    await brewery.grantRole(await brewery.MINTER_ROLE(), minter.address);
    await classManager.grantRole(await classManager.MANAGER_ROLE(), brewery.address);

    await mead.connect(rewardsPool).approve(brewery.address, ethers.constants.MaxUint256);

    await brewery.addTier(tiers[0], yields[0]);
    await brewery.addTier(tiers[1], yields[1]);
    await brewery.addTier(tiers[2], yields[2]);
  });

  describe("mint", async () => {
    it("only the minter can mint new tokens", async () => {
      await expect(brewery.connect(alice).mint(alice.address, "test")).to.be.revertedWith("Incorrect role!");
      await brewery.connect(minter).mint(alice.address, "test");
      await brewery.connect(minter).mint(alice.address, "test");
      await brewery.connect(minter).mint(alice.address, "test");
      expect(await brewery.balanceOf(alice.address)).to.be.equal(3);
    });

    it("can't exceed wallet limit", async () => {
      await brewery.connect(minter).mint(alice.address, "test");
      await brewery.connect(minter).mint(alice.address, "test");
      await brewery.connect(minter).mint(alice.address, "test");
      await brewery.connect(minter).mint(alice.address, "test");
      await brewery.connect(minter).mint(alice.address, "test");
      await expect(brewery.connect(minter).mint(alice.address, "test")).to.be.revertedWith("Cant go over limit");
    });

    it("token infos should be correct", async () => {
      await brewery.connect(minter).mint(alice.address, "test");
      const stat = await brewery.breweryStats(1);
      expect(stat.name).equal("test");
      expect(stat.type_).equal(0);
      expect(stat.tier).equal(0);
      expect(stat.xp).equal(0);
    });
  });

  it("toggle trading", async () => {
    await brewery.connect(minter).mint(alice.address, "test");
    await expect(brewery.connect(alice).approve(bob.address, 1)).to.be.revertedWith("Trading is disabled");
    await expect(brewery.connect(alice).transferFrom(alice.address, bob.address, 1)).to.be.revertedWith("Trading is disabled");

    await brewery.setTradingEnabled(true);
    await brewery.connect(alice).approve(bob.address, 1);
    await brewery.connect(alice).transferFrom(alice.address, bob.address, 1);
    expect(await brewery.ownerOf(1)).to.be.equal(bob.address);
  });

  it("tier test", async () => {
    await brewery.connect(minter).mint(alice.address, "test");
    // XP: 0
    expect(await brewery.getTier(1)).to.be.equal(0);

    // XP: 10
    await brewery.addXP(1, 10);
    expect(await brewery.getTier(1)).to.be.equal(0);

    // XP: 100
    await brewery.addXP(1, 90);
    expect(await brewery.getTier(1)).to.be.equal(1);

    // XP: 200
    await brewery.addXP(1, 100);
    expect(await brewery.getTier(1)).to.be.equal(1);
    
    // XP: 250
    await brewery.addXP(1, 50);
    expect(await brewery.getTier(1)).to.be.equal(2);
  });

  it("XP earning", async () => {
    const lastTime = await getLatestBlockTimestamp();
    const startTime = lastTime + 86400*10;
    await brewery.setStartTime(startTime);
    await brewery.connect(minter).mint(alice.address, "test");

    // before startTime
    expect(await brewery.getPendingXp(1)).to.be.equal(0);

    // during the first fermentation period
    await setNextBlockTimestamp(startTime + baseFermentationPeriod / 2);
    await mineBlock();
    expect(await brewery.getPendingXp(1)).to.be.equal(0);

    // after fermenation period
    const fermentationTime = startTime + baseFermentationPeriod;
    await setNextBlockTimestamp(fermentationTime + 86400);
    await mineBlock();
    expect(await brewery.getPendingXp(1)).to.be.equal(86400 * baseExperiencePerSecond);

    // after first claim
    await brewery.connect(alice).claim(1);
    const lastClaimed = await getLatestBlockTimestamp();
    await setNextBlockTimestamp(lastClaimed + 86400);
    await mineBlock();
    expect(await brewery.getPendingXp(1)).to.be.equal(0);

    // after fermenation period
    const fermentationTime1 = lastClaimed + baseFermentationPeriod;
    await setNextBlockTimestamp(fermentationTime1 + 86400);
    await mineBlock();
    expect(await brewery.getPendingXp(1)).to.be.equal(86400 * baseExperiencePerSecond);
  });

  it("Pending Mead", async () => {
    const lastTime = await getLatestBlockTimestamp();
    const startTime = lastTime + 86400*10;
    await brewery.setStartTime(startTime);
    await brewery.connect(minter).mint(alice.address, "test");
    const mintTime = await getLatestBlockTimestamp();

    // before startTime
    expect(await brewery.pendingMead(1)).to.be.equal(0);

    // during the first fermentation period
    const rewardPeriod = baseFermentationPeriod / 2;
    await setNextBlockTimestamp(startTime + rewardPeriod);
    await mineBlock();
    const tier = await brewery.getTier(1);
    const rewardAmount = yields[tier.toNumber()].div(86400).mul(rewardPeriod);
    expect(await brewery.getRewardPeriod(mintTime)).to.be.equal(rewardPeriod);
    expect(await brewery.pendingMead(1)).to.be.equal(rewardAmount);

    // after fermenation period
    const rewardPeriod1 = baseFermentationPeriod + 86400;
    const fermentationTime = startTime + baseFermentationPeriod;
    await setNextBlockTimestamp(fermentationTime + 86400);
    await mineBlock();
    const tier1 = await brewery.getTier(1);
    const rewardAmount1 = yields[tier1.toNumber()].div(86400).mul(rewardPeriod1);
    expect(await brewery.getRewardPeriod(mintTime)).to.be.equal(rewardPeriod1);
    expect(await brewery.pendingMead(1)).to.be.equal(rewardAmount1);

    // after first claim
    const rewardPeriod2 = 86400;
    await brewery.connect(alice).claim(1);
    const lastClaimed = await getLatestBlockTimestamp();
    await setNextBlockTimestamp(lastClaimed + rewardPeriod2);
    await mineBlock();
    const tier2 = await brewery.getTier(1);
    const rewardAmount2 = yields[tier2.toNumber()].div(86400).mul(rewardPeriod2);
    expect(await brewery.getRewardPeriod(lastClaimed)).to.be.equal(rewardPeriod2);
    expect(await brewery.pendingMead(1)).to.be.equal(rewardAmount2);

    // after fermenation period
    const rewardPeriod3 = baseFermentationPeriod + 86400;
    const fermentationTime1 = lastClaimed + baseFermentationPeriod;
    await setNextBlockTimestamp(fermentationTime1 + 86400);
    await mineBlock();
    const tier3 = await brewery.getTier(1);
    const rewardAmount3 = yields[tier3.toNumber()].div(86400).mul(rewardPeriod3);
    expect(await brewery.getRewardPeriod(lastClaimed)).to.be.equal(rewardPeriod3);
    expect(await brewery.pendingMead(1)).to.be.equal(rewardAmount3);
  });

  describe("Claim", async () => {
    it("only owner can claim rewards", async () => {
      await brewery.connect(minter).mint(alice.address, "test");
      const lastClaimed = await getLatestBlockTimestamp();
      await setNextBlockTimestamp(lastClaimed + 86400);
      await expect(brewery.connect(bob).claim(1)).to.be.revertedWith("Must be owner of this BREWERY");
    });

    it("NFT shouldn't be listed", async () => {
      await brewery.connect(minter).mint(alice.address, "test");
      await brewery.setTradingEnabled(true);
      await brewery.connect(alice).approve(bob.address, 1)
      const lastClaimed = await getLatestBlockTimestamp();
      await setNextBlockTimestamp(lastClaimed + 86400);
      await expect(brewery.connect(alice).claim(1)).to.be.revertedWith("BREWERY is approved for spending/listed");
    });

    it("Correct amount should be claimed, correct tax goes to treasury", async () => {
      await brewery.connect(minter).mint(alice.address, "test");
      const lastClaimed = await getLatestBlockTimestamp();
      const rewardPeriod = baseFermentationPeriod / 2;
      // tier is zero
      const rewardAmount = yields[0].div(86400).mul(rewardPeriod);
      const claimTax = rewardAmount.mul(taxRates[0]).div(10000);
      const userReward = rewardAmount.sub(claimTax);

      await setNextBlockTimestamp(lastClaimed + rewardPeriod);

      const aliceMead0 = await mead.balanceOf(alice.address);
      const treasuryMead0 = await mead.balanceOf(tavernsKeep.address);
      const totalYield0 = (await brewery.breweryStats(1)).totalYield;
      await brewery.connect(alice).claim(1);
      const aliceMead1 = await mead.balanceOf(alice.address);
      const treasuryMead1 = await mead.balanceOf(tavernsKeep.address);
      const totalYield1 = (await brewery.breweryStats(1)).totalYield;

      expect(aliceMead1.sub(aliceMead0)).to.be.equal(userReward);
      expect(treasuryMead1.sub(treasuryMead0)).to.be.equal(claimTax);
      expect(totalYield1.sub(totalYield0)).to.be.equal(rewardAmount);
    });

    it("Correct XP should be gained", async () => {
      await brewery.connect(minter).mint(alice.address, "test");
      const lastClaimed = await getLatestBlockTimestamp();
      const xpGainPeriod = 86400;
      const rewardPeriod = baseFermentationPeriod + xpGainPeriod;
      const newXP = xpGainPeriod * baseExperiencePerSecond;

      await setNextBlockTimestamp(lastClaimed + rewardPeriod);

      const xp0 = (await brewery.breweryStats(1)).xp;
      await brewery.connect(alice).claim(1);
      const xp1 = (await brewery.breweryStats(1)).xp;

      expect(xp1.sub(xp0)).to.be.equal(newXP);
    });
  });

  describe("compound", async () => {
    it("compound several items with one nft reward", async () => {
      const count = 3;

      await brewery.connect(minter).mint(alice.address, "test");
      const lastClaimed = await getLatestBlockTimestamp();
      const rewardPeriod = baseFermentationPeriod * 100;
      const totalMeads = yields[0].div(86400).mul(rewardPeriod);
      const totalCost = (await settings.breweryCost()).mul(count);
      const treasuryCut = totalCost.mul(await settings.treasuryFee()).div(1e4);
      const userClaimAmount = totalMeads.sub(totalCost);
      const claimTax = userClaimAmount.mul(taxRates[0]).div(10000);
      const userReward = userClaimAmount.sub(claimTax);

      await setNextBlockTimestamp(lastClaimed + rewardPeriod);

      const aliceMead0 = await mead.balanceOf(alice.address);
      const treasuryMead0 = await mead.balanceOf(tavernsKeep.address);
      const breweryCount0 = await brewery.balanceOf(alice.address);
      await brewery.connect(alice).compound(count);
      const aliceMead1 = await mead.balanceOf(alice.address);
      const treasuryMead1 = await mead.balanceOf(tavernsKeep.address);
      const breweryCount1 = await brewery.balanceOf(alice.address);

      expect(breweryCount1.sub(breweryCount0)).to.be.equal(count);
      expect(aliceMead1.sub(aliceMead0)).to.be.equal(userReward);
      expect(treasuryMead1.sub(treasuryMead0)).to.be.equal(claimTax.add(treasuryCut));
    });

    it("compound all", async () => {
      await brewery.connect(minter).mint(alice.address, "test");
      const lastClaimed = await getLatestBlockTimestamp();
      const rewardPeriod = baseFermentationPeriod * 10;
      const totalMeads = yields[0].div(86400).mul(rewardPeriod);
      const count = totalMeads.div(await settings.breweryCost());

      await setNextBlockTimestamp(lastClaimed + rewardPeriod);

      const breweryCount0 = await brewery.balanceOf(alice.address);
      await brewery.connect(alice).compoundAll();
      const breweryCount1 = await brewery.balanceOf(alice.address);

      expect(breweryCount1.sub(breweryCount0)).to.be.equal(count);
    });
  });

  after(async () => {
    await hre.network.provider.send("evm_revert", [preTestSnapshotID]);
  });
});
