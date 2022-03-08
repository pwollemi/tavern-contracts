pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./ERC-721/Renovation.sol";
import "./TavernSettings.sol";
import "./interfaces/IClassManager.sol";

/**
 * @notice Homekit manager is a smart contract that allows users to purchase small, less efficient BREWERYs at fixed prices
 *        
 *        A homekit is always worth $100 in MEAD, and they always produce $0.30 worth of MEAD a day.
 *        Homekits can be converted into BREWERYs based on the face value. Take an example where MEAD is $10 each:
 *            A brewery will cost 100 MEAD which is $1,000
 *            So you'd need 10 homekits to convert into a BREWERY
 */
contract HonmekitManager is Initializable, AccessControlUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    
    /// @notice The data contract containing all of the necessary settings
    TavernSettings public settings;

    /// @notice HOMEKITs can't earn before this time
    uint256 public startTime;

    struct HomekitStats {
        uint256 count;             // How many are owned
        uint256 totalYield;        // The total yield this brewery has produced
        uint256 lastTimeClaimed;   // The last time this brewery has had a claim
    }

    /// @notice A mapping of how many homekits each person has
    mapping (address => HomekitStats) public homekits;

    /// @notice The homekit price in USDC
    uint256 public homekitPrice;

    /// @notice The base production rate in USDC per second
    uint256 public productionRatePerSecond;

    /// @notice Emitted events
    event Claim(address indexed owner, uint256 tokenId, uint256 amount, uint256 timestamp);
    event LevelUp(address indexed owner, uint256 tokenId, uint256 tier, uint256 xp, uint256 timestamp);

    /// @notice The specific role to give to smart contracts or wallets that will be allowed to create
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    /// @notice Modifier to test that the caller has a specific role (interface to AccessControl)
    modifier isRole(bytes32 role) {
        require(hasRole(role, msg.sender), "Incorrect role!");
        _;
    }

    function initialize(
        address _tavernSettings,
        uint256 _price,
        uint256 _yield
    ) external initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CREATOR_ROLE, msg.sender);

        settings = TavernSettings(_tavernSettings);
    }

    /**
     * @notice Returns how many MEAD tokens you get for 1 USDC
     */
    function getMeadforUSDC() public view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = settings.mead();
        path[1] = settings.usdc();
        uint256[] memory amountsOut = settings.dexRouter().getAmountsIn(10 ** ERC20Upgradeable(settings.usdc()).decimals(), path);
        return amountsOut[0];
    }

    /**
     * @notice Helper to calculate the reward period with respect to a start time
     */
    function getRewardPeriod(uint256 lastClaimed) public view returns (uint256) {
        // If we haven't passed the last time since we claimed (also the create time) then return zero as we haven't started yet
        // If we we passed the last time since we claimed (or the create time), but we haven't passed it 
        if (block.timestamp < startTime) {
            return 0;
        } else if (lastClaimed < startTime) {
            return block.timestamp - startTime;
        } else {
            return block.timestamp - lastClaimed;
        }
    }

    /**
     * @notice Returns the unclaimed MEAD rewards for a given BREWERY 
     */
    function pendingMead() public view returns (uint256) {
        // rewardPeriod is 0 when currentTime is less than start time
        uint256 rewardPeriod = getRewardPeriod(homekits[msg.sender].lastTimeClaimed);
        return rewardPeriod * productionRatePerSecond * getMeadforUSDC();
    }

    /**
     * @notice Claims the rewards from a specific node
     */
    function claim(address account) public {
        require(homekits[msg.sender].count > 0, "Must own homekits");

    }
}