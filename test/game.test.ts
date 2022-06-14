/* eslint-disable no-await-in-loop */
import hre, { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import chai from 'chai';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { setNextBlockTimestamp, getLatestBlockTimestamp, mineBlock, latest, impersonateForToken, duration } from "../helper/utils";
import { deployContract, deployProxy } from "../helper/deployer";
import { Brewery, ClassManager, ERC20, ERC20Mock, Game, IERC20, Mead, Renovation, TavernSettings, WhitelistPresale, XMead } from "../typechain";

chai.use(solidity);
const { expect } = chai;

describe('Game', () => {
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let tom: SignerWithAddress;
  let deployer: SignerWithAddress;

  let mead: ERC20Mock;
  let game: Game;

  let rollAfter;

  
  const initialSupply = ethers.utils.parseUnits("1000000000", 18);
  const betAmount1 = ethers.utils.parseUnits("1000", 18);
  const betAmount2 = ethers.utils.parseUnits("100", 18);
  const betAmount3 = ethers.utils.parseUnits("10", 18);

  before(async () => {
    [deployer, alice, bob, tom] = await ethers.getSigners();
    mead = <ERC20Mock>await deployContract("ERC20Mock", "TEST", "TEST", initialSupply);
    game = <Game>await deployProxy("Game", mead.address);

    await mead.transfer(alice.address, initialSupply.div(10));
    await mead.transfer(bob.address, initialSupply.div(10));
    await mead.transfer(tom.address, initialSupply.div(10));

    await mead.connect(alice).approve(game.address, ethers.constants.MaxUint256);
    await mead.connect(bob).approve(game.address, ethers.constants.MaxUint256);
    await mead.connect(tom).approve(game.address, ethers.constants.MaxUint256);
  });

  it("create game", async () => {
    rollAfter = await getLatestBlockTimestamp() + 86400;
    await game.createGame(rollAfter);
    await game.createGame(rollAfter);

    expect(await game.totalGames()).to.be.equal(2);

    const game1 = await game.games(1);
    expect(game1.status).to.be.equal(0);
    expect(game1.rollAfter).to.be.equal(rollAfter);
  });

  it("bet on game", async () => {
    await expect(game.connect(alice).betOnGame(3, 0, betAmount1)).to.be.revertedWith("Invalid game id");
    await expect(game.connect(alice).betOnGame(1, 0, 0)).to.be.revertedWith("Invalid zero amount");

    await game.connect(alice).betOnGame(1, 0, betAmount1);
    await game.connect(bob).betOnGame(1, 1, betAmount2);
    await game.connect(tom).betOnGame(2, 2, betAmount3);

    const bet1 = await game.bets(1, alice.address);
    const bet2 = await game.bets(1, bob.address);
    const bet3 = await game.bets(2, tom.address);

    expect(bet1.option).to.be.equal(0);
    expect(bet1.amount).to.be.equal(betAmount1);
    expect(bet1.claimed).to.be.equal(false);
    expect(bet2.option).to.be.equal(1);
    expect(bet2.amount).to.be.equal(betAmount2);
    expect(bet2.claimed).to.be.equal(false);
    expect(bet3.option).to.be.equal(2);
    expect(bet3.amount).to.be.equal(betAmount3);
    expect(bet3.claimed).to.be.equal(false);
 
    await expect(game.connect(alice).betOnGame(1, 0, betAmount1)).to.be.revertedWith("Already bet");
  });

  it("roll the dice", async () => {
    await expect(game.roll(3)).to.be.revertedWith("Invalid game id");
    await expect(game.roll(1)).to.be.revertedWith("Not roll time");

    setNextBlockTimestamp(rollAfter);
    await game.roll(1);

    const game1 = await game.games(1);
    expect(game1.status).to.be.equal(1);

    console.log(await game.getResults(1));
    console.log((await game.getWinAmount(1, alice.address)).toString());
    console.log((await game.getWinAmount(1, bob.address)).toString());

    await expect(game.roll(1)).to.be.revertedWith("Already rolled");
  });

  it("can't roll or bet to ended game", async () => {
    await expect(game.roll(1)).to.be.revertedWith("Already rolled");
    await expect(game.connect(alice).betOnGame(1, 0, 0)).to.be.revertedWith("Dice is already rolled");
  });
});
