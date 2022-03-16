
import { ethers } from "hardhat";
import { expect } from "chai";
import { advanceBlockTo } from "./utilities"
import { deployProxy } from "../helper/deployer";
import { TavernStaking } from "../typechain";

const initialSupply = ethers.utils.parseUnits("100000000", 18);
const FIRST_BONUS_MULTIPLIER = 18;
const SECOND_BONUS_MULTIPLIER = 4.5;

describe("TavernStaking", function () {
	before(async function () {
		this.signers = await ethers.getSigners()
		this.alice = this.signers[0]
		this.bob = this.signers[1]
		this.carol = this.signers[2]
		this.dev = this.signers[3]
		this.minter = this.signers[4]

		this.TavernStaking = await ethers.getContractFactory("TavernStaking")
		this.ERC20Mock = await ethers.getContractFactory("ERC20Mock", this.minter)
	})

	beforeEach(async function () {
		this.mead = await this.ERC20Mock.deploy("Mead", "MEAD", initialSupply)
		this.lp = await this.ERC20Mock.deploy("LPToken", "LP", "10000000000")
	})

	it("should set correct state variables", async function () {
		this.chef = <TavernStaking>await deployProxy("TavernStaking",
			this.mead.address, this.lp.address, 1000, 0, 3000, 1000, 2000)
		await this.chef.deployed()
		const mead = await this.chef.mead()
		expect(mead).to.equal(this.mead.address)
	})

	context("With ERC/LP token added to the field", function () {
		beforeEach(async function () {
			this.lp = await this.ERC20Mock.deploy("LPToken", "LP", "10000000000")
			await this.lp.transfer(this.alice.address, "1000")
			await this.lp.transfer(this.bob.address, "1000")
			await this.lp.transfer(this.carol.address, "1000")
		})

		it("should set correct pool info", async function () {
			this.chef = <TavernStaking>await deployProxy("TavernStaking",
				this.mead.address,
				this.lp.address,
				100, 100, 500, 200, 300);
			await this.chef.deployed()

			const poolInfo = await this.chef.poolInfo();
			expect(poolInfo.lpToken).to.equal(this.lp.address);
		})

		it("should allow emergency withdraw", async function () {
			// 100 per block farming rate starting at block 100 with bonus until block 1000
			this.chef = <TavernStaking>await deployProxy("TavernStaking",
				this.mead.address, this.lp.address,
				100, 100, 500, 200, 300);
			await this.chef.deployed()

			await this.lp.connect(this.bob).approve(this.chef.address, "1000")
			await this.chef.connect(this.bob).deposit("100")
			expect(await this.lp.balanceOf(this.bob.address)).to.equal("900")

			await this.chef.connect(this.bob).emergencyWithdraw()
			expect(await this.lp.balanceOf(this.bob.address)).to.equal("1000")
		})

		it("should give out MEADs only after farming time", async function () {
			// 100 per block farming rate starting at block 100 with bonus until block 1000
			const startBlock = await ethers.provider.getBlockNumber() + 100;
			this.chef = <TavernStaking>await deployProxy("TavernStaking",
				this.mead.address,
				this.lp.address,
				100,	// rewardPerBlock
				startBlock,	// startBlock
				startBlock + 500, // rewardEndBlock
				startBlock + 100,	// firstBonusBlock
				startBlock + 200	// secondBonusBlock
			);
			await this.chef.deployed()
			await this.mead.transfer(this.chef.address, 1000000000);

			await this.lp.connect(this.bob).approve(this.chef.address, "1000")
			await this.chef.connect(this.bob).deposit("100")

			// Checking first bonus multiplier
			await advanceBlockTo(startBlock - 11)
			await this.chef.connect(this.bob).deposit("0") // block 90
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal("0")

			await advanceBlockTo(startBlock - 6)
			await this.chef.connect(this.bob).deposit("0") // block 95
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal("0")

			await advanceBlockTo(startBlock - 1)
			await this.chef.connect(this.bob).deposit("0") // block 100
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal("0")

			await advanceBlockTo(startBlock + 3)
			// await this.chef.connect(this.bob).deposit("0") // block 101
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal(100 * FIRST_BONUS_MULTIPLIER * 3)

			await advanceBlockTo(startBlock + 4)
			await this.chef.connect(this.bob).deposit("0") // block 105
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal(100 * FIRST_BONUS_MULTIPLIER * 5)

			await this.chef.connect(this.bob).harvest();
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(100 * FIRST_BONUS_MULTIPLIER * 6)
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal(0)
			expect(await this.mead.balanceOf(this.chef.address)).to.equal(1000000000 - 100 * FIRST_BONUS_MULTIPLIER * 6);

			// Checking second bonus multiplier
			await advanceBlockTo(startBlock + 99);
			await this.chef.connect(this.bob).deposit("0") // block 200
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal(100 * FIRST_BONUS_MULTIPLIER * (100 - 6))

			await advanceBlockTo(startBlock + 110); // block 205
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal(
				100 * FIRST_BONUS_MULTIPLIER * (100 - 6) +
				100 * SECOND_BONUS_MULTIPLIER * 10
			)

			// Check third bonus multiplier
			await advanceBlockTo(startBlock + 205); // block 205
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal(
				100 * FIRST_BONUS_MULTIPLIER * (100 - 6) +
				100 * SECOND_BONUS_MULTIPLIER * 100 +
				100 * 5
			)

			await this.chef.connect(this.bob).harvest(); // block 206
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(
				100 * FIRST_BONUS_MULTIPLIER * 100 +
				100 * SECOND_BONUS_MULTIPLIER * 100 +
				100 * 6
			);
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal(0);
		})

		it("should not distribute MEADs if no one deposit", async function () {
			// 100 per block farming rate starting at block 200 with bonus until block 1000
			const startBlock = await ethers.provider.getBlockNumber() + 100;
			this.chef = <TavernStaking>await deployProxy("TavernStaking",
				this.mead.address,
				this.lp.address,
				100,	// rewardPerBlock
				startBlock,	// startBlock
				startBlock + 500, // rewardEndBlock
				startBlock + 100,	// firstBonusBlock
				startBlock + 200	// secondBonusBlock
			);
			await this.chef.deployed()
			await this.mead.transfer(this.chef.address, 1000000000);
			await this.lp.connect(this.bob).approve(this.chef.address, "1000")

			await advanceBlockTo(startBlock - 1)
			expect(await this.mead.balanceOf(this.chef.address)).to.equal(1000000000);

			await advanceBlockTo(startBlock + 4)
			expect(await this.mead.balanceOf(this.chef.address)).to.equal(1000000000);

			await advanceBlockTo(startBlock + 9)
			await this.chef.connect(this.bob).deposit(10) // block 210
			expect(await this.mead.balanceOf(this.chef.address)).to.equal(1000000000);
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(0)
			expect(await this.lp.balanceOf(this.bob.address)).to.equal(1000 - 10)

			await advanceBlockTo(startBlock + 19)
			await this.chef.connect(this.bob).withdraw(10) // block 220
			expect(await this.mead.balanceOf(this.chef.address)).to.equal(1000000000 - 100 * FIRST_BONUS_MULTIPLIER * 10);
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(100 * FIRST_BONUS_MULTIPLIER * 10)
			expect(await this.lp.balanceOf(this.bob.address)).to.equal(1000)
		})

		it("should distribute MEADs properly for each staker", async function () {
			// 100 per block farming rate starting at block 300 with bonus until block 1000
			const startBlock = await ethers.provider.getBlockNumber() + 100;
			this.chef = <TavernStaking>await deployProxy("TavernStaking",
				this.mead.address,
				this.lp.address,
				100,	// rewardPerBlock
				startBlock,	// startBlock
				startBlock + 500, // rewardEndBlock
				startBlock + 100,	// firstBonusBlock
				startBlock + 200	// secondBonusBlock
			);
			await this.chef.deployed()
			await this.mead.transfer(this.chef.address, initialSupply);

			await this.lp.connect(this.alice).approve(this.chef.address, "1000", {
				from: this.alice.address,
			})
			await this.lp.connect(this.bob).approve(this.chef.address, "1000", {
				from: this.bob.address,
			})
			await this.lp.connect(this.carol).approve(this.chef.address, "1000", {
				from: this.carol.address,
			})
			// Alice deposits 10 LPs at block 310
			await advanceBlockTo(startBlock + 9)
			await this.chef.connect(this.alice).deposit(10, { from: this.alice.address })
			// Bob deposits 20 LPs at block 314
			await advanceBlockTo(startBlock + 13)
			await this.chef.connect(this.bob).deposit(20, { from: this.bob.address })
			// Carol deposits 30 LPs at block 318
			await advanceBlockTo(startBlock + 17)
			await this.chef.connect(this.carol).deposit(30, { from: this.carol.address })

			//   Alice deposits 10 more LPs at block 320. At this point:
			//   Alice should have: 4*1800 + 4*1/3*1800 + 2*1/6*1800 = 10200
			//   Bob: 							4*2/3*1800 + 2*2/6*1800 = 6000
			//   Carol:							2*3/6*1800 = 1800
			await advanceBlockTo(startBlock + 19)
			await this.chef.connect(this.alice).deposit(10, { from: this.alice.address })
			expect(await this.chef.pendingRewards(this.alice.address)).to.equal(10200)
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal(6000)
			expect(await this.chef.pendingRewards(this.carol.address)).to.equal(1800)

			// Bob withdraws 5 LPs at block 330. At this point:
			//   Bob should have: 6000 + 10*2/7*1800 = 11142
			//   Alice: 10200 + 10*2/7*1800 = 15342
			//   Carol: 1800 + 10*3/7*1800 = 9514
			await advanceBlockTo(startBlock + 29)
			await this.chef.connect(this.bob).withdraw(5, { from: this.bob.address })
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(11142)
			expect(await this.chef.pendingRewards(this.alice.address)).to.equal(15342)
			expect(await this.chef.pendingRewards(this.carol.address)).to.equal(9514)
			expect(await this.chef.pendingRewards(this.bob.address)).to.equal(0)
			// Alice withdraws 20 LPs at block 340.
			// Bob withdraws 15 LPs at block 350.
			// Carol withdraws 30 LPs at block 360.
			await advanceBlockTo(startBlock + 39)
			await this.chef.connect(this.alice).withdraw(20, { from: this.alice.address })
			await advanceBlockTo(startBlock + 49)
			await this.chef.connect(this.bob).withdraw(15, { from: this.bob.address })
			await advanceBlockTo(startBlock + 59)
			await this.chef.connect(this.carol).withdraw(30, { from: this.carol.address })
			expect(await this.mead.balanceOf(this.chef.address))
				.to.equal(initialSupply.sub(100 * FIRST_BONUS_MULTIPLIER * 50 - 3))
			// Alice should have: 10200 + 10*2/7*1800 + 10*2/6.5*1800 = 20880
			expect(await this.mead.balanceOf(this.alice.address)).to.equal(20881)
			// Bob should have: 11142 + 10*1.5/6.5 * 1800 + 10*1.5/4.5*1800 = 21295
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(21295)
			// Carol should have: 2*3/6*1800 + 10*3/7*1800 + 10*3/6.5*1800 + 10*3/4.5*1800 + 10*1800 = 47821
			expect(await this.mead.balanceOf(this.carol.address)).to.equal(47821)
			// All of them should have 1000 LPs back.
			expect(await this.lp.balanceOf(this.alice.address)).to.equal("1000")
			expect(await this.lp.balanceOf(this.bob.address)).to.equal("1000")
			expect(await this.lp.balanceOf(this.carol.address)).to.equal("1000")
		})

		it("should stop giving bonus MEADs after the bonus period ends", async function () {
			// 100 per block farming rate starting at block 500 with bonus until block 600
			const startBlock = await ethers.provider.getBlockNumber() + 100;
			this.chef = <TavernStaking>await deployProxy("TavernStaking",
				this.mead.address,
				this.lp.address,
				100,	// rewardPerBlock
				startBlock,	// startBlock
				startBlock + 500, // rewardEndBlock
				startBlock + 100,	// firstBonusBlock
				startBlock + 200	// secondBonusBlock
			);
			await this.chef.deployed()
			await this.mead.transfer(this.chef.address, initialSupply);
			await this.lp.connect(this.alice).approve(this.chef.address, "1000", { from: this.alice.address })

			expect(await this.chef.getCurrentRewardsPerBlock()).to.equal(0);

			// Alice deposits 10 LPs at block 590
			await advanceBlockTo(startBlock + 89)
			await this.chef.connect(this.alice).deposit("10", { from: this.alice.address })
			expect(await this.chef.getCurrentRewardsPerBlock()).to.equal(100 * FIRST_BONUS_MULTIPLIER);

			// At block 605, she should have 1800*10 + 450*10 = 22500 pending.
			await advanceBlockTo(startBlock + 110)
			expect(await this.chef.pendingRewards(this.alice.address)).to.equal(22500)
			expect(await this.chef.getCurrentRewardsPerBlock()).to.equal(100 * SECOND_BONUS_MULTIPLIER);

			// At block 705, she should have 1800*10 + 450*100 + 100*5 = 63500 pending.
			await advanceBlockTo(startBlock + 205)
			expect(await this.chef.pendingRewards(this.alice.address)).to.equal(63500)
			expect(await this.chef.getCurrentRewardsPerBlock()).to.equal(100);

			// At block 706, Alice withdraws all pending rewards and should get 36600.
			await this.chef.connect(this.alice).harvest();
			expect(await this.chef.pendingRewards(this.alice.address)).to.equal(0)
			expect(await this.mead.balanceOf(this.alice.address)).to.equal(63600)

			// At block 800, 1800*10 + 450*100 + 100*100 - 63600 = 9400
			await advanceBlockTo(startBlock + 300)
			expect(await this.chef.pendingRewards(this.alice.address)).to.equal(9400)

			// At block 1500, 1800*10 + 450*100 + 100*300 - 63600 = 29400
			await advanceBlockTo(startBlock + 1000)
			expect(await this.chef.pendingRewards(this.alice.address)).to.equal(29400)
			expect(await this.chef.getCurrentRewardsPerBlock()).to.equal(0);

			await this.chef.connect(this.alice).harvest();
			expect(await this.mead.balanceOf(this.alice.address)).to.equal(93000)
		})
	})
})