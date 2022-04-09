/* eslint-disable no-await-in-loop */
import hre, { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import chai from 'chai';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { setNextBlockTimestamp, getLatestBlockTimestamp, mineBlock, latest, impersonateForToken, duration } from "../helper/utils";
import { deployContract, deployProxy } from "../helper/deployer";
import { Brewery, ClassManager, IERC20, Mead, Renovation, TavernEscrowTrader, TavernSettings, WhitelistPresale, XMead } from "../typechain";
import { TreasuryAddress } from "../scripts/ADDRESSES";

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
  let marketplace: TavernEscrowTrader;
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

  const walletLimit = 100;

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
    // marketplace fee 15% or 1500/10000
    await settings.setMarketplaceMeadFee(1500);

    await impersonateForToken(USDC, deployer, "1000000");
    await usdc.transfer(alice.address, ethers.utils.parseUnits("100000", USDC.decimals));
    await usdc.transfer(bob.address, ethers.utils.parseUnits("100000", USDC.decimals));

    await mead.transfer(rewardsPool.address, initialSupply.div(10));
    await mead.approve(alice.address, initialSupply.div(100));
    await mead.transfer(alice.address, initialSupply.div(100));
    await mead.approve(bob.address, initialSupply.div(100));
    await mead.transfer(bob.address, initialSupply.div(100));
  });

  beforeEach(async () => {
    brewery = <Brewery>await deployProxy("Brewery", settings.address, baseFermentationPeriod, baseExperiencePerSecond);
    renovation = <Renovation>await deployProxy("Renovation", brewery.address);
    marketplace = <TavernEscrowTrader>await deployProxy("TavernEscrowTrader", settings.address, mead.address, brewery.address)

    await brewery.grantRole(await brewery.MINTER_ROLE(), minter.address);
    await classManager.grantRole(await classManager.MANAGER_ROLE(), brewery.address);

    await mead.connect(rewardsPool).approve(brewery.address, ethers.constants.MaxUint256);

    await brewery.addTier(tiers[0], yields[0]);
    await brewery.addTier(tiers[1], yields[1]);
    await brewery.addTier(tiers[2], yields[2]);
    await brewery.setTradingEnabled(true);

    await brewery.setMaxBreweries(100);

    // whitelist for remove extrafee
    mead.setWhitelist(marketplace.address, true);
  });

  it("order", async () => {
    let tx = await brewery.connect(minter).mint(alice.address, "test");
    let result = tx.wait();
    let event = (await result).events.find(e => e.event === "Transfer");
    let tokenId = event.args.tokenId;

    let balanceAliceBefore = await mead.balanceOf(alice.address);
    let balanceTreasuryBefore = await mead.balanceOf(tavernsKeep.address);
    let balanceRewardPoolBefore = await mead.balanceOf(rewardsPool.address);
    let balanceBobBefore = await mead.balanceOf(bob.address);

    // alice owner of the nft
    let ownerA = await brewery.ownerOf(tokenId);
    expect(ownerA).to.be.equal(alice.address);

    await brewery.connect(alice).approve(marketplace.address, tokenId);

    // create
    await marketplace.connect(alice).createOrder(tokenId, 1000);
    let orders = await marketplace.fetchPageOrders(0, 1);
    let aliceOrder = orders[0][0];
    expect(aliceOrder.tokenId).to.be.equal(tokenId);
    expect(aliceOrder.price).to.be.equal(1000);

    // marketplace owner of the nft
    let ownerM = await brewery.ownerOf(tokenId);
    expect(ownerM).to.be.equal(marketplace.address);

    // update price
    await marketplace.connect(alice).updateOrder(aliceOrder.id, 2000);

    // sell
    await mead.connect(bob).approve(marketplace.address, 2000);
    await marketplace.connect(bob).buyOrder(aliceOrder.id, 2000);
    orders = await marketplace.fetchPageOrders(0, 1);
    aliceOrder = orders[0][0];

    // status change to sell
    expect(aliceOrder.status).to.be.equal(2);

    let balanceAliceAfter = await mead.balanceOf(alice.address);
    let balanceTreasuryAfter = await mead.balanceOf(tavernsKeep.address);
    let balanceRewardPoolAfter = await mead.balanceOf(rewardsPool.address);
    let balanceBobAfter = await mead.balanceOf(bob.address);

    // bob buy the nft for 2000
    expect(balanceBobAfter).to.be.equal(balanceBobBefore.sub(2000));
    // 85% to the seller 2000 * 0.85 = 1700
    expect(balanceAliceAfter).to.be.equal(balanceAliceBefore.add(1700));    
    // for the tax 30% go to the treasury 300 * 0.3 = 90
    // expect(balanceTreasuryAfter).to.be.equal(balanceTreasuryBefore.add(90));
    // // for the tax 70% go to the pool 300 * 0.7 = 210
    // expect(balanceRewardPoolAfter).to.be.equal(balanceRewardPoolBefore.add(210));

    // buyer (bob) owner of the nft
    let owner = await brewery.ownerOf(tokenId);
    expect(owner).to.be.equal(bob.address);
  });

  it("errors", async () => {
    let tx = await brewery.connect(minter).mint(alice.address, "test");
    let result = tx.wait();
    let event = (await result).events.find(e => e.event === "Transfer");
    let aliceTokenId = event.args.tokenId;

    tx = await brewery.connect(minter).mint(bob.address, "test2");
    result = tx.wait();
    event = (await result).events.find(e => e.event === "Transfer");
    let bobTokenId = event.args.tokenId;

    // alice owner of the nft
    let ownerA = await brewery.ownerOf(aliceTokenId);
    expect(ownerA).to.be.equal(alice.address);
    // buyer (bob) owner of the nft
    let ownerB = await brewery.ownerOf(bobTokenId);
    expect(ownerB).to.be.equal(bob.address);

    // can't create order with other nft
    let orderFailed = marketplace.connect(bob).createOrder(aliceTokenId, 1000);
    await expect(orderFailed).to.be.revertedWith("Not owner of token");

    // can't sell unaprove nft
    orderFailed = marketplace.connect(bob).createOrder(bobTokenId, 1000);
    await expect(orderFailed).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");

    // can't sell at 0
    await brewery.connect(bob).approve(marketplace.address, bobTokenId);
    orderFailed = marketplace.connect(bob).createOrder(bobTokenId, 0);
    await expect(orderFailed).to.be.revertedWith("The price need to be more than 0");

    // can't update price of other seller order
    await brewery.connect(alice).approve(marketplace.address, aliceTokenId);
    let orderTx = await marketplace.connect(alice).createOrder(aliceTokenId, 1000);
    let resultTX = await orderTx.wait();
    let orderEvent = resultTX.events.find(e => e.event === "OrderAdded");
    let orderId = orderEvent.args.id;

    let updateFailed = marketplace.connect(bob).updateOrder(orderId, 1);
    await expect(updateFailed).to.be.revertedWith("Only the seller can update order");

    // can't update price at 0
    updateFailed = marketplace.connect(alice).updateOrder(orderId, 0);
    await expect(updateFailed).to.be.revertedWith("The price need to be more than 0");

    // can't buy at bad amount
    let buyFailed = marketplace.connect(bob).buyOrder(orderId, 1);
    await expect(buyFailed).to.be.revertedWith("Amount isn't equal to price!");

    // can't cancel other order
    let cancelFailed = marketplace.connect(bob).cancelOrder(orderId);
    await expect(cancelFailed).to.be.revertedWith("Only the seller can cancel order");

    // can't update cancel order
    await marketplace.connect(alice).cancelOrder(orderId);
    updateFailed = marketplace.connect(alice).updateOrder(orderId, 555);
    await expect(updateFailed).to.be.revertedWith("Order is no longer available!");

    // can't buy cancel order
    buyFailed = marketplace.connect(bob).buyOrder(orderId, 1000);
    await expect(buyFailed).to.be.revertedWith("Order is no longer available!");

    // can't cancel already cancel order
    cancelFailed = marketplace.connect(alice).cancelOrder(orderId);
    await expect(cancelFailed).to.be.revertedWith("Order is no longer available!");

    let order = await marketplace.orders(orderId);
    expect(order.status).to.be.equal(1);
  });

  it("events", async () => {
    let tx = await brewery.connect(minter).mint(alice.address, "test");
    let result = tx.wait();
    let event = (await result).events.find(e => e.event === "Transfer");
    let aliceTokenId = event.args.tokenId;

    tx = await brewery.connect(minter).mint(bob.address, "test2");
    result = tx.wait();
    event = (await result).events.find(e => e.event === "Transfer");
    let bobTokenId = event.args.tokenId;

    // create event
    await brewery.connect(alice).approve(marketplace.address, aliceTokenId);
    let orderTx = await marketplace.connect(alice).createOrder(aliceTokenId, 1000);
    let resultTX = await orderTx.wait();
    let orderEvent = resultTX.events.find(e => e.event === "OrderAdded");
    let orderAliceId = orderEvent.args.id;

    await brewery.connect(bob).approve(marketplace.address, bobTokenId);
    orderTx = await marketplace.connect(bob).createOrder(bobTokenId, 500);
    resultTX = await orderTx.wait();
    orderEvent = resultTX.events.find(e => e.event === "OrderAdded");
    let orderBobId = orderEvent.args.id;

    expect(orderEvent.args.id).to.be.equal(1);
    expect(orderEvent.args.tokenId).to.be.equal(bobTokenId);
    expect(orderEvent.args.seller).to.be.equal(bob.address);
    expect(orderEvent.args.price).to.be.equal(500);

    // update event 
    orderTx = await marketplace.connect(alice).updateOrder(orderAliceId, 600);
    resultTX = await orderTx.wait();
    orderEvent = resultTX.events.find(e => e.event === "OrderUpdated");
    expect(orderEvent.args.id).to.be.equal(orderAliceId);
    expect(orderEvent.args.price).to.be.equal(600);

    // cancel event 
    orderTx = await marketplace.connect(bob).cancelOrder(orderBobId);
    resultTX = await orderTx.wait();
    orderEvent = resultTX.events.find(e => e.event === "OrderCanceled");
    expect(orderEvent.args.id).to.be.equal(orderBobId);

    // buy event
    await mead.connect(bob).approve(marketplace.address, 600);
    orderTx = await marketplace.connect(bob).buyOrder(orderAliceId, 600);
    resultTX = await orderTx.wait();
    orderEvent = resultTX.events.find(e => e.event === "OrderBought");
    expect(orderEvent.args.id).to.be.equal(orderAliceId);
    expect(orderEvent.args.buyer).to.be.equal(bob.address);

  });

  it("orders", async () => {
    let aliceTokens = [];
    let bobTokens = [];
    // minting
    for (let index = 0; index < 10; index++) {
      let tx = await brewery.connect(minter).mint(alice.address, "alice" + index);
      let result = await tx.wait();
      let event = result.events.find(e => e.event === "Transfer");
      aliceTokens.push(event.args.tokenId);
    }

    for (let index = 0; index < 10; index++) {
      let tx = await brewery.connect(minter).mint(bob.address, "bob" + index);
      let result = await tx.wait();
      let event = result.events.find(e => e.event === "Transfer");
      bobTokens.push(event.args.tokenId);
    }

    // approve all    
    await brewery.connect(alice).setApprovalForAll(marketplace.address, true);
    await brewery.connect(bob).setApprovalForAll(marketplace.address, true);

    // create order
    for (let index = 0; index < 10; index++) {
      await marketplace.connect(alice).createOrder(aliceTokens[index], 100 + 25 * index);
      await marketplace.connect(bob).createOrder(bobTokens[index], 100 + 30 * index);
    }

    let orders = await marketplace.fetchPageOrders(0, 100);
    expect(orders[0].length).to.be.equal(20);
    let ownedOrders = await marketplace.fetchPageOwned(bob.address, 0, 100);
    expect(ownedOrders[0].length).to.be.equal(10);

    // buy
    await mead.connect(bob).approve(marketplace.address, 1000000);
    await marketplace.connect(bob).buyOrder(0, 100);
    await marketplace.connect(bob).buyOrder(2, 125);

    let boughtOrders = await marketplace.fetchPageBought(bob.address, 0, 100);
    expect(boughtOrders[0].length).to.be.equal(2);
  });

  after(async () => {
    await hre.network.provider.send("evm_revert", [preTestSnapshotID]);
  });
});
