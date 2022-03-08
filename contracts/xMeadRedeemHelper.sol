pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./TavernSettings.sol";
import "./Presales/WhitelistPresale.sol";
import "./ERC-20/xMead.sol";

contract xMeadRedeemHelper is Initializable, AccessControlUpgradeable {

    /// @notice The settings contract
    TavernSettings public settings;

    /// @notice The whitelist presale contract
    WhitelistPresale public whitelist;

    /// @notice Flag to enable redeem
    bool public enabled;

    /// @notice The time that the redeemer contract was enabled
    uint256 public startTime;

    /// @notice The interval in seconds where each tranche of xMEAD is able to be unlocked
    uint256 public interval;

    /// @notice The limtis imposed on each account
    mapping (address => uint256) redeems;

    /// @notice How much tokens per day
    uint256 public tranche; 

    /// @notice Relevant events to emit
    event Redeemed(address account, uint256 amount);

    /// @notice The specific role to give to contracts so they can manage the brewers reputation of accounts
    bytes32 public constant BYPASS_ROLE = keccak256("BYPASS_ROLE");

    /// @notice Modifier to test that the caller has a specific role (interface to AccessControl)
    modifier isRole(bytes32 role) {
        require(hasRole(role, msg.sender), "Incorrect role!");
        _;
    }

    function initialize(address _tavernSettings, address _whitelist, uint256 _tranch, uint256 _interval) external initializer {
        __Context_init();
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        settings = TavernSettings(_tavernSettings);
        whitelist = WhitelistPresale(_whitelist);

        tranche = _tranch;
        interval = _interval;
    }

    /**
     * @notice Enable the redeem contract
     */
    function enable(bool _enabled) external isRole(DEFAULT_ADMIN_ROLE) {
        enabled = _enabled;
        startTime = block.timestamp;
    }

    /**
     * @notice This function is called by the users
     * @dev If user/contract has BYPASS_ROLE they are able to bypass the limits
     */
    function redeem(uint256 amount) external {
        require(enabled, "Redeems are disabled");

        // If the sender has the bypass role, then we let them redeem the full amount
        // Otherwise we need to check if the limits have been used
        if (hasRole(BYPASS_ROLE, msg.sender)) {
            XMead(settings.xmead()).redeem(msg.sender, amount);
            IERC20Upgradeable(settings.mead()).transferFrom(settings.rewardsPool(), msg.sender, amount);
        } else {
            uint256 totalIssued = whitelist.deposited(msg.sender) * whitelist.tokenRate() / (10**whitelist.usdc().decimals());
            uint256 unlocked = totalIssued * tranche * (getInterval() + 1) / 1e4;
            require(redeems[msg.sender] + amount <= unlocked, "You cant redeem more than your allowance");

            XMead(settings.xmead()).redeem(msg.sender, amount);
            IERC20Upgradeable(settings.mead()).transferFrom(settings.rewardsPool(), msg.sender, amount);

            redeems[msg.sender] += amount;
        }
    }

    /**
     * @notice Returns the interval that we are in based on the `interval` variable
     */
    function getInterval() public view returns (uint256) {
        if (enabled && block.timestamp > startTime) {
            return (block.timestamp - startTime) / interval;
        } else {
            return 0;
        }
    }
}