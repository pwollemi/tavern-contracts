import hre, { ethers } from "hardhat";
import { deployContract, deployProxy } from "../../helper/deployer";

import ERC20 from '../../abis/ERC20.json';
import { sleep } from "../../helper/utils";
import { PREMINT_FORKED_MAINNET, PRESALE_MAINNET, PRESALE_TESTNET, TreasuryAddress, USDC_MAINNET, USDC_TESTNET, XMEAD_MAINNET, XMEAD_TESTNET } from "../ADDRESSES";
import { Brewery_address, xMead_address } from "../NFT_ADDRESSES";

async function main() {
    // The signers
    const [deployer, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const xMeadAddress = '0xfb69818be1d509707007c6ab1cd8b91980d3c971';
    const breweryAddress = '0xf5E723f0FD54f8c75f0Da8A8F9D68Bf67B20b850';
    const usdcAddress = USDC_MAINNET;
    const whitelistPresaleAddress = PRESALE_MAINNET;

    const USDC = await ethers.getContractAt(ERC20, usdcAddress);
    const usdcDecimals = await USDC.decimals();

    const whitelistLimit = '10';

    // Deploy the premint contract
    //const Premint = await deployProxy("Premint", TreasuryAddress, breweryAddress, xMeadAddress, usdcAddress, whitelistPresaleAddress);
    const Premint = await ethers.getContractAt("Premint", '0x13cCeFf8B770B2a2C505425515B2D40C2a55D7E2');
    console.log("Premint contract deployed!", Premint.address);
    // let tx = await Premint.clearBatches();
    // await tx.wait();
    // console.log("Done");

    // tx = await Premint.addBatch('2000', 100 * 10**usdcDecimals);
    // await tx.wait();
    // console.log("Done");

    // tx = await Premint.addBatch('1600', 200 * 10**usdcDecimals);
    // await tx.wait();
    // console.log("Done");

    // tx = await Premint.addBatch('1200', 300 * 10**usdcDecimals);
    // await tx.wait();
    // console.log("Done");

    // tx = await Premint.addBatch('800', 400 * 10**usdcDecimals);
    // await tx.wait();
    // console.log("Done");

    // tx = await Premint.addBatch('400', 500 * 10**usdcDecimals);
    // await tx.wait();
    // console.log("Done");

    // tx = await Premint.setWhitelistBatch('3600', whitelistLimit);
    // await tx.wait();
    // console.log("Done");

    console.log((await Premint.getWhitelistBatchAmount()).toString());

    // Let the premint contract mint BREWERYs
    const Brewery = await ethers.getContractAt("Brewery", breweryAddress)
    await Brewery.grantRole(await Brewery.MINTER_ROLE(), Premint.address);
    console.log(`Premint contract (${Premint.address}) is enabled to mint BREWERYs!`);

    // Let premint contract redeem xmead
    const XMead = await ethers.getContractAt("XMead", xMeadAddress);
    await XMead.connect(addr1).grantRole(await XMead.REDEEMER_ROLE(), Premint.address);
    console.log(`Premint contract (${Premint.address}) is enabled to redeem xMEAD!`);


    
    // // const Premint = await deployProxy("Premint", "");
    // await Premint.setWhitelistBatch('3600', whitelistLimit);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
