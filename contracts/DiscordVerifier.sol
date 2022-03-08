pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./ERC-721/Brewery.sol";

contract DiscordVerifier is Initializable, OwnableUpgradeable {

    address breweryAddress;

    /// @notice A mapping of addresses to their respective codes
    mapping (address => string) public codes;

    event Verified(address sender, string code);

    function initialize(address _breweryAddress) external initializer {
        __Context_init();
        __Ownable_init();

        breweryAddress = _breweryAddress;
    }

    function verify(string memory code) external {
        require(Brewery(breweryAddress).balanceOf(msg.sender) > 0, "User doesnt own any brewerys");
        codes[msg.sender] = code;
        emit Verified(msg.sender, code);
    }
}