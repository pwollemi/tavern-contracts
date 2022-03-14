pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @notice A contract that stores MEAD in a locked fashion to be distributed by an external spender
 *
 *  1. The rewards pool is a type of StoragePool, where the Brewery contract can spend its MEAD
 *
 *  2. The redeem pool is a type of StoragePool, where the xMeadRedeemerHelper contract can spend its MEAD
 */
contract StoragePool is Initializable, OwnableUpgradeable {

    // The address of the ERC-20 storage token spender
    address spender;

    // The address of the ERC-20 storage token
    address token;

    function initialize(address _spender, address _token) external initializer {
        __Context_init();
        __Ownable_init();

        spender = _spender;
        token = _token;

        approve(spender, token);
    }

    /**
     * @notice Approve a wallet to spend the balance of this 
     */
    function approve(address _spender, address _token) public onlyOwner {
        IERC20Upgradeable(_token).approve(_spender, type(uint256).max);
    }

    /**
     * @notice Used for emergency or for migration
     */
    function drain(address _token) external onlyOwner {
        IERC20Upgradeable(_token).transfer(msg.sender, IERC20Upgradeable(_token).balanceOf(address(this)));
    }
}