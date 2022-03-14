
import { ethers } from "hardhat";
import { expect } from "chai";
import { advanceBlockTo } from "./utilities"
import { deployProxy } from "../helper/deployer";
import { Mead, TavernStaking } from "../typechain";

const routerAddress = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const USDC = {
	address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
	holder: "0xbf14db80d9275fb721383a77c00ae180fc40ae98",
	decimals: 6,
	symbol: "USDC",
}
const initialSupply = ethers.utils.parseUnits("100000000", 18);
const FIRST_BONUS_MULTIPLIER = 6;
const SECOND_BONUS_MULTIPLIER = 3;

describe("TavernStaking", function () {
	before(async function () {
		this.signers = await ethers.getSigners()
		this.alice = this.signers[0]
		this.bob = this.signers[1]
		this.carol = this.signers[2]
		this.dev = this.signers[3]
		this.minter = this.signers[4]

		this.TavernStaking = await ethers.getContractFactory("TavernStaking")
		this.MeadToken = await ethers.getContractFactory("Mead")
		this.ERC20Mock = await ethers.getContractFactory("ERC20Mock", this.minter)
	})

	beforeEach(async function () {
		this.mead = <Mead>await deployProxy("Mead", routerAddress, USDC.address, this.minter.address, initialSupply);
		await this.mead.deployed()
	})

	it("should set correct state variables", async function () {
		this.chef = <TavernStaking>await deployProxy("TavernStaking", this.mead.address, "1000", "0", "1000", "2000")
		await this.chef.deployed()
		await this.mead.transferOwnership(this.chef.address)
		const mead = await this.chef.mead()
		expect(mead).to.equal(this.mead.address)
	})

	context("With ERC/LP token added to the field", function () {
		beforeEach(async function () {
			this.lp = await this.ERC20Mock.deploy("LPToken", "LP", "10000000000")
			await this.lp.transfer(this.alice.address, "1000")
			await this.lp.transfer(this.bob.address, "1000")
			await this.lp.transfer(this.carol.address, "1000")

			this.lp2 = await this.ERC20Mock.deploy("LPToken2", "LP2", "10000000000")
			await this.lp2.transfer(this.alice.address, "1000")
			await this.lp2.transfer(this.bob.address, "1000")
			await this.lp2.transfer(this.carol.address, "1000")
		})

		it("should set correct pool info", async function () {
			this.chef = <TavernStaking>await deployProxy("TavernStaking", this.mead.address, "100", "100", "1000", "2000")
			await this.chef.deployed()

			await expect(this.chef.setPoolInfo(this.lp.address, true))
				.to.be.revertedWith('function call to a non-contract account');

			await this.chef.setPoolInfo(this.lp.address, false);
			const poolInfo = await this.chef.poolInfo();
			expect(poolInfo.lpToken).to.equal(this.lp.address);
		})

		it("should allow emergency withdraw", async function () {
			// 100 per block farming rate starting at block 100 with bonus until block 1000
			this.chef = <TavernStaking>await deployProxy("TavernStaking", this.mead.address, "100", "100", "1000", "2000")
			await this.chef.deployed()
			await this.chef.setPoolInfo(this.lp.address, false)

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
				100,	// rewardPerBlock
				startBlock,	// startBlock
				startBlock + 100,	// firstBonusBlock
				startBlock + 200	// secondBonusBlock
			);
			await this.chef.deployed()
			await this.chef.setPoolInfo(this.lp.address, false)
			await this.mead.transfer(this.chef.address, 1000000000);

			await this.lp.connect(this.bob).approve(this.chef.address, "1000")
			await this.chef.connect(this.bob).deposit("100")
			await advanceBlockTo(startBlock - 11)

			// Checking first bonus multiplier
			await this.chef.connect(this.bob).deposit("0") // block 90
			expect(await this.mead.balanceOf(this.bob.address)).to.equal("0")
			await advanceBlockTo(startBlock - 6)

			await this.chef.connect(this.bob).deposit("0") // block 95
			expect(await this.mead.balanceOf(this.bob.address)).to.equal("0")
			await advanceBlockTo(startBlock - 1)

			await this.chef.connect(this.bob).deposit("0") // block 100
			expect(await this.mead.balanceOf(this.bob.address)).to.equal("0")
			await advanceBlockTo(startBlock)

			await this.chef.connect(this.bob).deposit("0") // block 101
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(100 * FIRST_BONUS_MULTIPLIER)

			await advanceBlockTo(startBlock + 4)
			await this.chef.connect(this.bob).deposit("0") // block 105

			expect(await this.mead.balanceOf(this.bob.address)).to.equal(100 * FIRST_BONUS_MULTIPLIER * 5)
			expect(await this.mead.balanceOf(this.chef.address)).to.equal(1000000000 - 100 * FIRST_BONUS_MULTIPLIER * 5);

			// Checking second bonus multiplier
			await advanceBlockTo(startBlock + 99);
			await this.chef.connect(this.bob).deposit("0") // block 200
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(100 * FIRST_BONUS_MULTIPLIER * 100)

			await advanceBlockTo(startBlock + 104);
			await this.chef.connect(this.bob).deposit("0") // block 205
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(
				100 * FIRST_BONUS_MULTIPLIER * 100 +
				100 * SECOND_BONUS_MULTIPLIER * 5
			)

			// Check third bonus multiplier
			await advanceBlockTo(startBlock + 204);
			await this.chef.connect(this.bob).deposit("0") // block 205
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(
				100 * FIRST_BONUS_MULTIPLIER * 100 +
				100 * SECOND_BONUS_MULTIPLIER * 100 +
				100 * 5
			)
		})

		it("should not distribute MEADs if no one deposit", async function () {
			// 100 per block farming rate starting at block 200 with bonus until block 1000
			const startBlock = await ethers.provider.getBlockNumber() + 100;
			this.chef = <TavernStaking>await deployProxy("TavernStaking",
				this.mead.address,
				100,	// rewardPerBlock
				startBlock,	// startBlock
				startBlock + 100,	// firstBonusBlock
				startBlock + 200	// secondBonusBlock
			);
			await this.chef.deployed()
			await this.chef.setPoolInfo(this.lp.address, false)
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
				100,	// rewardPerBlock
				startBlock,	// startBlock
				startBlock + 100,	// firstBonusBlock
				startBlock + 200	// secondBonusBlock
			);
			await this.chef.deployed()
			await this.chef.setPoolInfo(this.lp.address, false)
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
			//   Alice should have: 4*600 + 4*1/3*600 + 2*1/6*600 = 3400
			//   TavernStaking should have the remaining: 10000 - 3400 = 6600
			await advanceBlockTo(startBlock + 19)
			await this.chef.connect(this.alice).deposit(10, { from: this.alice.address })
			expect(await this.mead.balanceOf(this.alice.address)).to.equal(3400)
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(0)
			expect(await this.mead.balanceOf(this.carol.address)).to.equal(0)
			expect(await this.mead.balanceOf(this.chef.address)).to.equal(initialSupply.sub(3400))
			// Bob withdraws 5 LPs at block 330. At this point:
			//   Bob should have: 4*2/3*600 + 2*2/6*600 + 10*2/7*600 = 3714
			await advanceBlockTo(startBlock + 29)
			await this.chef.connect(this.bob).withdraw(5, { from: this.bob.address })
			expect(await this.mead.balanceOf(this.alice.address)).to.equal(3400)
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(3714)
			expect(await this.mead.balanceOf(this.carol.address)).to.equal(0)
			expect(await this.mead.balanceOf(this.chef.address)).to.equal(initialSupply.sub(3400 + 3714))
			// Alice withdraws 20 LPs at block 340.
			// Bob withdraws 15 LPs at block 350.
			// Carol withdraws 30 LPs at block 360.
			await advanceBlockTo(startBlock + 39)
			await this.chef.connect(this.alice).withdraw(20, { from: this.alice.address })
			await advanceBlockTo(startBlock + 49)
			await this.chef.connect(this.bob).withdraw(15, { from: this.bob.address })
			await advanceBlockTo(startBlock + 59)
			await this.chef.connect(this.carol).withdraw(30, { from: this.carol.address })
			// expect(await this.mead.balanceOf(this.chef.address)).to.equal(initialSupply.sub(100 * 6 * 60))
			expect(await this.mead.balanceOf(this.chef.address)).to.equal(initialSupply.sub(100 * 6 * 50 - 1))
			// Alice should have: 3400 + 10*2/7*600 + 10*2/6.5*600 = 6960
			expect(await this.mead.balanceOf(this.alice.address)).to.equal(6960)
			// Bob should have: 3714 + 10*1.5/6.5 * 600 + 10*1.5/4.5*600 = 7099
			expect(await this.mead.balanceOf(this.bob.address)).to.equal(7099)
			// Carol should have: 2*3/6*600 + 10*3/7*600 + 10*3/6.5*600 + 10*3/4.5*600 + 10*600 = 15940
			expect(await this.mead.balanceOf(this.carol.address)).to.equal(15940)
			// All of them should have 1000 LPs back.
			expect(await this.lp.balanceOf(this.alice.address)).to.equal("1000")
			expect(await this.lp.balanceOf(this.bob.address)).to.equal("1000")
			expect(await this.lp.balanceOf(this.carol.address)).to.equal("1000")
		})

		// 	it("should stop giving bonus MEADs after the bonus period ends", async function () {
		// 		// 100 per block farming rate starting at block 500 with bonus until block 600
		// 		this.chef = await this.TavernStaking.deploy(this.mead.address, this.dev.address, "100", "500", "600")
		// 		await this.mead.transferOwnership(this.chef.address)
		// 		await this.lp.connect(this.alice).approve(this.chef.address, "1000", { from: this.alice.address })
		// 		await this.chef.setPoolInfo(this.lp.address, true)
		// 		// Alice deposits 10 LPs at block 590
		// 		await advanceBlockTo("589")
		// 		await this.chef.connect(this.alice).deposit(0, "10", { from: this.alice.address })
		// 		// At block 605, she should have 1000*10 + 100*5 = 10500 pending.
		// 		await advanceBlockTo("605")
		// 		expect(await this.chef.pendingRewards(0, this.alice.address)).to.equal("10500")
		// 		// At block 606, Alice withdraws all pending rewards and should get 10600.
		// 		await this.chef.connect(this.alice).deposit(0, "0", { from: this.alice.address })
		// 		expect(await this.chef.pendingRewards(0, this.alice.address)).to.equal("0")
		// 		expect(await this.mead.balanceOf(this.alice.address)).to.equal("10600")
		// 	})
	})
})