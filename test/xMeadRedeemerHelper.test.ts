/* eslint-disable no-await-in-loop */
import hre, { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import chai from 'chai';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { setNextBlockTimestamp, getLatestBlockTimestamp, mineBlock, latest, impersonateForToken } from "../helper/utils";
import { deployContract, deployProxy } from "../helper/deployer";
import { ClassManager, IERC20, Mead, TavernSettings, WhitelistPresale, XMead, XMeadRedeemHelper } from "../typechain";

chai.use(solidity);
const { expect } = chai;

const USDC = {
  address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  holder: "0xbf14db80d9275fb721383a77c00ae180fc40ae98",
  decimals: 6,
  symbol: "USDC",
}

const routerAddress = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const tavernsKeep = ethers.constants.AddressZero; // templates
const initialSupply = ethers.utils.parseUnits("1000000000000", 18);

describe('Public Presale', () => {
  let preTestSnapshotID: any;

  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let deployer: SignerWithAddress;
  let rewardsPool: SignerWithAddress;

  let whitelistPresale: WhitelistPresale;
  let xMead: XMead;
  let mead: Mead;
  let usdc: IERC20;
  let redeemer: XMeadRedeemHelper;
  let settings: TavernSettings;
  let classManager: ClassManager;

  const raiseAim = ethers.utils.parseUnits("100000", 6);
  const tokenRate = ethers.utils.parseUnits("100", 18); // 100 xMEAD per 1 USDC
  const min = ethers.utils.parseUnits("100", 6)
  const timeInterval = 900; // 15 mins

  const max = ethers.utils.parseUnits("12000", 18);

  const tranche = 1000; // release 10%
  const interval = 86400; // 1 day

  let xmeadAmount;

  before(async () => {
    preTestSnapshotID = await hre.network.provider.send("evm_snapshot");

    [deployer, alice, bob, rewardsPool] = await ethers.getSigners();
    usdc = <IERC20>await ethers.getContractAt("IERC20", USDC.address);
    xMead = <XMead>await deployContract("XMead");

    mead = <Mead>await deployProxy("Mead", routerAddress, USDC.address, ethers.constants.AddressZero, initialSupply);
    await mead.enableTrading();

    classManager = <ClassManager>await deployProxy("ClassManager", [0,100,200]);
    settings = <TavernSettings>await deployProxy("TavernSettings", xMead.address, mead.address, usdc.address, classManager.address, routerAddress, [1,1,1]);
    await settings.setRewardsPool(rewardsPool.address);

    await mead.transfer(rewardsPool.address, initialSupply.div(10));

    await impersonateForToken(USDC, deployer, "10000000");
    await usdc.transfer(alice.address, ethers.utils.parseUnits("1000000", USDC.decimals));
    await usdc.transfer(bob.address, ethers.utils.parseUnits("1000000", USDC.decimals));
  });

  beforeEach(async () => {
    whitelistPresale = <WhitelistPresale>await deployProxy("WhitelistPresale", xMead.address, usdc.address);
    await xMead.grantRole(await xMead.ISSUER_ROLE(), whitelistPresale.address);
    await whitelistPresale.configure(raiseAim, tokenRate, min, max, 5, timeInterval);
    await whitelistPresale.addToWhitelist([deployer.address]);

    redeemer = <XMeadRedeemHelper>await deployProxy("xMeadRedeemHelper", settings.address, whitelistPresale.address, tranche, interval);
    await xMead.grantRole(await xMead.REDEEMER_ROLE(), redeemer.address);
    await mead.connect(rewardsPool).approve(redeemer.address, ethers.constants.MaxUint256);

    // Alice invests into presale
    await whitelistPresale.addToWhitelist([alice.address]);
    await whitelistPresale.start();
    const startTime = await getLatestBlockTimestamp();
    const investAmount = ethers.utils.parseUnits("10000", USDC.decimals);
    xmeadAmount = investAmount.mul(tokenRate).div(1e6);
    await setNextBlockTimestamp(startTime + 864000);
    await usdc.connect(alice).approve(whitelistPresale.address, ethers.constants.MaxUint256);
    await whitelistPresale.connect(alice).invest(investAmount);
  });

  describe("Enable redeem", async () => {
    it("only admin can call this function", async () => {
      await expect(redeemer.connect(alice).enable(true)).to.be.revertedWith("Incorrect role!");
      await redeemer.enable(true);
    });

    it("start time should be set when it was enabled first time", async () => {
      await redeemer.enable(true);
      expect(await redeemer.enabled()).to.be.equal(true);
      expect(await redeemer.startTime()).to.be.not.equal(0)

      const startTime = await redeemer.startTime();
      await redeemer.enable(true);
      expect(await redeemer.startTime()).to.be.equal(startTime);
    });
  });


  describe("Redeem", async () => {
    it("must be enabled to start redeem", async () => {
      await expect(redeemer.connect(alice).redeem(0)).to.be.revertedWith("Redeems are disabled");
    });

    it("BYPASS_ROLE can redeem any amount of tokens", async () => {
      await redeemer.enable(true);
      await expect(redeemer.connect(alice).redeem(xmeadAmount)).to.be.revertedWith("You cant redeem more than your allowance");
      await redeemer.grantRole(await redeemer.BYPASS_ROLE(), alice.address);
      await redeemer.connect(alice).redeem(xmeadAmount);
      expect(await redeemer.redeems(alice.address)).to.be.equal(xmeadAmount);
      expect(await mead.balanceOf(alice.address)).to.be.equal(xmeadAmount); 
    });

    it("redeem works fine", async () => {
      await redeemer.enable(true);
      const startTime = await getLatestBlockTimestamp();
      
      // before first interval
      const amount0 = xmeadAmount.mul(tranche).div(1e4);
      expect(await redeemer.unlockedAmount(alice.address)).to.be.equal(amount0);
      await expect(redeemer.connect(alice).redeem(amount0.add(1))).to.be.revertedWith("You cant redeem more than your allowance");
      const xMeadBalance0 = await xMead.balanceOf(alice.address);
      const meadBalance0 = await mead.balanceOf(alice.address);
      await redeemer.connect(alice).redeem(amount0);
      expect(xMeadBalance0.sub(await xMead.balanceOf(alice.address))).to.be.equal(amount0);
      expect((await mead.balanceOf(alice.address)).sub(meadBalance0)).to.be.equal(amount0);
      expect(await redeemer.redeems(alice.address)).to.be.equal(amount0);


      // 5th interval
      await setNextBlockTimestamp(startTime + interval * 5);
      await mineBlock();
      const amount1 = amount0.mul(5);
      expect(await redeemer.unlockedAmount(alice.address)).to.be.equal(amount0.add(amount1));
      await expect(redeemer.connect(alice).redeem(amount1.add(1))).to.be.revertedWith("You cant redeem more than your allowance");
      const xMeadBalance1 = await xMead.balanceOf(alice.address);
      const meadBalance1 = await mead.balanceOf(alice.address);
      await redeemer.connect(alice).redeem(amount1);
      expect(xMeadBalance1.sub(await xMead.balanceOf(alice.address))).to.be.equal(amount1);
      expect((await mead.balanceOf(alice.address)).sub(meadBalance1)).to.be.equal(amount1);
      expect(await redeemer.redeems(alice.address)).to.be.equal(amount0.add(amount1));
    });
  })

  after(async () => {
    await hre.network.provider.send("evm_revert", [preTestSnapshotID]);
  });
});
