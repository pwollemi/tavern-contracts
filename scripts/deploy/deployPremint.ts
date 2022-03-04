import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { PREMINT_FORKED_MAINNET, PRESALE_MAINNET, PRESALE_TESTNET, TreasuryAddress, USDC_MAINNET, USDC_TESTNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const breweryAddress = Brewery_address;
    const xMeadAddress = xMead_address;
    const usdcAddress = USDC_MAINNET;
    const whitelistPresaleAddress = PRESALE_MAINNET;

    const USDC = await ethers.getContractAt(ERC20, usdcAddress);
    const usdcDecimals = await USDC.decimals();

    const whitelistLimit = '10';

    // Deploy the premint contract
    const Premint = await deployProxy("Premint", TreasuryAddress, breweryAddress, xMeadAddress, usdcAddress, whitelistPresaleAddress);
    await Premint.addBatch('10', 100 * 10**usdcDecimals);
    await Premint.addBatch('5', 200 * 10**usdcDecimals);
    await Premint.addBatch('3', 300 * 10**usdcDecimals);
    await Premint.addBatch('2', 400 * 10**usdcDecimals);
    await Premint.addBatch('1', 500 * 10**usdcDecimals);
    await Premint.setWhitelistBatch('3600', whitelistLimit);

    console.log("Premint contract deployed!", Premint.address);

    // Let the premint contract mint BREWERYs
    const Brewery = await ethers.getContractAt("Brewery", Brewery_address)
    await Brewery.connect(deployer).grantRole(await Brewery.MINTER_ROLE(), Premint.address);
    console.log(`Premint contract (${Premint.address}) is enabled to mint BREWERYs!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
