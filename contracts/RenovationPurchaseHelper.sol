pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./TavernSettings.sol";
import "./ERC-20/xMead.sol";
import "./ERC-721/Renovation.sol";

/**
 * @notice There are some conditions to make this work
 * 
 *  - Helper needs to be able to mint renovations (Renovation::CREATOR_ROLE)
 *  - Helper should be able to burn xMEAD (XMead::REDEEMER_ROLE)
 * 
 */
contract RenovationPurchaseHelper is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice The data contract containing all of the necessary settings
    TavernSettings public settings;

    /// @notice Brewery contract
    Renovation public renovation;

    /// @notice A renovation item for sale
    struct Item {
        uint256 price;
        uint256 supply;
        uint256 renovationType;
        uint256 intValue;
        string strValue;
    }

    /// @notice The mapping of item IDs to their data
    mapping (uint256 => Item) items;

    /// @notice How many items are in items
    uint256 public totalItems;

    function initialize(address _settings) external initializer {
        __Context_init();
        __Ownable_init();

        // Store the settings
        settings = TavernSettings(_settings);
        renovation = Renovation(settings.renovationAddress());
    }

    /**
     * @notice Adds an item to the store to be purchased
     */
    function addItem(uint256 price, uint256 supply, uint256 renovationType, uint256 intValue, string memory strValue) external onlyOwner {
        bytes32 id = keccak256(abi.encodePacked(renovationType, intValue, strValue));
        items[totalItems] = Item({
            price: price,
            supply: supply,
            renovationType: renovationType,
            intValue: intValue,
            strValue: strValue
        });
        totalItems++;
    }

    /**
     * ===========================================================
     *            INTERFACE
     * ============================================================
     */

    /**
     * @notice Purchases a BREWERY using MEAD
     */
    function purchaseWithXMead(address account, uint256 id) external {
        require(items[id].supply > 0, "There are no items left");

        XMead(settings.xmead()).redeem(msg.sender, items[id].price);
        IERC20Upgradeable(settings.mead()).safeTransferFrom(settings.redeemPool(), settings.tavernsKeep(), items[id].price * settings.treasuryFee() / settings.PRECISION());
        IERC20Upgradeable(settings.mead()).safeTransferFrom(settings.redeemPool(), settings.rewardsPool(), items[id].price * settings.rewardPoolFee() / settings.PRECISION());

        // Mint logic
        renovation.create(account, items[id].renovationType, items[id].intValue, items[id].strValue);

        items[id].supply -= 1;
    }

    /**
     * @notice Purchases a BREWERY using MEAD
     */
    function purchaseWithMead(address account, uint256 id) external {
        require(items[id].supply > 0, "There are no items left");

        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.tavernsKeep(), items[id].price * settings.treasuryFee() / settings.PRECISION());
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.rewardsPool(), items[id].price * settings.rewardPoolFee() / settings.PRECISION());

        // Mint logic
        renovation.create(account, items[id].renovationType, items[id].intValue, items[id].strValue);

        items[id].supply -= 1;
    }

    /**
     * ===========================================================
     *            ADMIN FUNCTIONS
     * ============================================================
     */

    /**
     * @notice Sets the price
     */
    function setPrice(uint256 id, uint256 newPrice) external onlyOwner {
        items[id].price = newPrice;
    }

    /**
     * @notice Sets the supply
     */
    function setSupply(uint256 id, uint256 newSupply) external onlyOwner {
        items[id].supply = newSupply;
    }

    /**
     * @notice Sets the item
     */
    function setItem(uint256 id, uint256 renovationType, uint256 intValue, string memory strValue) external onlyOwner {
        items[id].renovationType = renovationType;
        items[id].intValue = intValue;
        items[id].strValue = strValue;
    }
}