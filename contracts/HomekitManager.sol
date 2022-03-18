pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./ERC-721/Renovation.sol";
import "./TavernSettings.sol";
import "./interfaces/IClassManager.sol";
import "./ERC-20/Mead.sol";

/**
 * @notice Homekit manager is a smart contract that allows users to purchase small, less efficient BREWERYs at fixed prices
 *        
 *        A homekit is always worth $100 in MEAD, and they always produce $0.30 worth of MEAD a day.
 *        Homekits can be converted into BREWERYs based on the face value. Take an example where MEAD is $10 each:
 *            A brewery will cost 100 MEAD which is $1,000
 *            So you'd need 10 homekits to convert into a BREWERY
 */
contract HomekitManager is Initializable, AccessControlUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    
    struct HomekitStats {
        uint256 count;             // How many are owned
        uint256 totalYield;        // The total yield this homekit has produced
        uint256 lastTimeClaimed;   // The last time this homeki has had a claim
        uint256 pendingYields;     // Yields that produced but not claimed
    }

    /// @notice The data contract containing all of the necessary settings
    TavernSettings public settings;

    /// @notice HOMEKITs can't earn before this time
    uint256 public startTime;

    /// @notice A mapping of how many homekits each person has
    mapping (address => HomekitStats) public homekits;

    /// @notice The homekit price in USDC
    uint256 public homekitPrice;

    /// @notice wallet limit
    uint256 public homekitWalletLimit;

    /// @notice The upper liquidity ratio (when to apply the higher discount)
    uint256 public liquidityRatio0;

    /// @notice The lower liquidity ratio (when to apply the lower discount)
    uint256 public liquidityRatio1;

    /// @notice The discount (to be applied when the liquidity ratio is equal to or above `liquidityRatio0`)
    uint256 public lpDiscount0;

    /// @notice The discount (to be applied when the liquidity ratio is equal to or less than `liquidityRatio1`)
    uint256 public lpDiscount1;

    /// @notice The base production rate in USDC per second
    uint256 public productionRatePerSecond;

    /// @notice Whether or not the LP payments have been enabled
    bool public isLPEnabled;

    /// @notice Emitted events
    event Claim(address indexed owner, uint256 amount, uint256 timestamp);

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
        uint256 _productionRatePerSecond
    ) external initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CREATOR_ROLE, msg.sender);

        settings = TavernSettings(_tavernSettings);
        productionRatePerSecond = _productionRatePerSecond;
        homekitPrice = _price;

        liquidityRatio0 = 100;  // 1%
        liquidityRatio1 = 2000; // 20%
        lpDiscount0 = 2500;     // 25%
        lpDiscount1 = 100;      // 1%

        startTime = block.timestamp;
    }

    //////////////////////////////////////////////////////////////
    //                                                          //
    //                         Purchase                         //
    //                                                          //
    //////////////////////////////////////////////////////////////
    /**
     * @notice Buy homekits
     */
    function _createTo(address _to, uint256 count) internal {
        HomekitStats storage stat = homekits[_to];
        require(stat.count + count <= homekitWalletLimit, "Cant go over wallet limit");
        stat.pendingYields = pendingMead(_to);
        stat.count += count;
        stat.lastTimeClaimed = block.timestamp;
    }

    /**
     * @notice Buy homekits with Mead
     */
    function buyWithMead(uint256 count) external {
        uint256 meadAmount = count * homekitPrice;
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.tavernsKeep(), meadAmount * settings.treasuryFee() / settings.PRECISION());
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.rewardsPool(), meadAmount * settings.rewardPoolFee() / settings.PRECISION());
        
        _createTo(msg.sender, count);
    }

    /**
     * @notice Buy homekits with LP
     */
    function buyWithLP(uint256 count) external {
        require(isLPEnabled, "LP discount off");

        // Take payment in MEAD-USDC LP tokens
        uint256 discount = calculateLPDiscount();
        uint256 homekitPriceInUSDC = getUSDCForMead(count * homekitPrice);
        uint256 homekitPriceInLP = getLPFromUSDC(homekitPriceInUSDC);
        uint256 discountAmount = homekitPriceInLP * discount / 1e4;
        IJoePair(settings.liquidityPair()).transferFrom(msg.sender, settings.tavernsKeep(), homekitPriceInLP - discountAmount);

        _createTo(msg.sender, count);
    }

    /**
     * @notice Create homekits forcefully
     */
    function createTo(address _to, uint256 count) external isRole(CREATOR_ROLE) returns (uint256) {
        _createTo(_to, count);
        return count * homekitPrice;
    }

    //////////////////////////////////////////////////////////////
    //                                                          //
    //                      Helpers for JOE                     //
    //                                                          //
    //////////////////////////////////////////////////////////////
    /**
     * @notice Calculates how much USDC 1 LP token is worth
     */
    function getUSDCReserve() public view returns (uint256) {
        (uint token0Reserve, uint token1Reserve,) = settings.liquidityPair().getReserves();
        if (settings.liquidityPair().token0() == settings.usdc()) {
            return token0Reserve;
        }
        return token1Reserve;
    }

    /**
     * @notice Calculates how many LP tokens are worth `_amount` in USDC (for payment)
     */
    function getLPFromUSDC(uint256 _amount) public view returns (uint256) {
        uint256 lpSupply = settings.liquidityPair().totalSupply();
        uint256 totalReserveInUSDC = getUSDCReserve() * 2;
        return _amount * lpSupply / totalReserveInUSDC;
    }

    /**
     * @notice Returns how many USDC tokens you need for inputed meadAmount
     */
    function getUSDCForMead(uint256 meadAmount) public view returns (uint256) {
        if (meadAmount == 0) return 0;
        address[] memory path = new address[](2);
        path[0] = settings.usdc();
        path[1] = settings.mead();
        uint256[] memory amountsOut = settings.dexRouter().getAmountsIn(meadAmount, path);
        return amountsOut[0];
    }

    /**
     * @notice Returns how many MEAD tokens you get for 1 USDC
     */
    function getMeadforUSDC(uint256 usdcAmount) public view returns (uint256) {
        if (usdcAmount == 0) return 0;
        address[] memory path = new address[](2);
        path[0] = settings.mead();
        path[1] = settings.usdc();
        uint256[] memory amountsOut = settings.dexRouter().getAmountsIn(usdcAmount, path);
        return amountsOut[0];
    }

    function getMeadSupply() public view returns (uint256) {
        return Mead(settings.mead()).totalSupply() / 10**ERC20Upgradeable(settings.mead()).decimals();
    }

    function getFDV() public view returns (uint256) {
        return getUSDCForOneMead() * getMeadSupply();
    }

    /**
     * @notice Returns how many USDC tokens you need for inputed meadAmount
     */
    function getUSDCForOneMead() public view returns (uint256) {
        return getUSDCForMead(10 ** ERC20Upgradeable(settings.mead()).decimals());
    }

    /**
     * @notice Calculates the liquidity ratio
     */
    function calculateLiquidityRatio() public view returns (uint256) {
        uint256 usdcReserves = getUSDCReserve();

        uint256 fdv = getFDV();

        // If this is 5% its bad, if this is 20% its good
        return usdcReserves * 1e4 / fdv;
    }

    /**
     * @notice Calculates the current LP discount
     */
    function calculateLPDiscount() public view returns (uint256) {
        uint256 liquidityRatio = calculateLiquidityRatio();

        if (liquidityRatio <= liquidityRatio0) {
            return lpDiscount0;
        }

        if (liquidityRatio >= liquidityRatio1) {
            return lpDiscount1;
        }

        // X is liquidity ratio       (y0 = 5      y1 = 20)
        // Y is discount              (x0 = 15     x1 =  1)
        return (lpDiscount0 * (liquidityRatio1 - liquidityRatio) + lpDiscount1 * (liquidityRatio - liquidityRatio0)) / (liquidityRatio1 - liquidityRatio0);
    }

    //////////////////////////////////////////////////////////////
    //                                                          //
    //                         Reward                           //
    //                                                          //
    //////////////////////////////////////////////////////////////
    /**
     * @notice Helper to calculate the reward period with respect to a start time
     */
    function getRewardPeriod(uint256 lastClaimed) public view returns (uint256) {
        // If we haven't passed the last time since we claimed (also the create time) then return zero as we haven't started yet
        // If we we passed the last time since we claimed (or the create time), but we haven't passed it 
        if (block.timestamp < startTime || lastClaimed == 0) {
            return 0;
        } else if (lastClaimed < startTime) {
            return block.timestamp - startTime;
        } else {
            return block.timestamp - lastClaimed;
        }
    }

    /**
     * @notice Returns the unclaimed MEAD rewards for a given Homekit 
     */
    function pendingMead(address _user) public view returns (uint256) {
        // rewardPeriod is 0 when currentTime is less than start time
        HomekitStats memory stat = homekits[_user];
        uint256 rewardPeriod = getRewardPeriod(stat.lastTimeClaimed);
        return getMeadforUSDC(rewardPeriod * productionRatePerSecond * stat.count) + stat.pendingYields;
    }

    /**
     * @notice Returns the brewers tax for the particular brewer
     */
    function getBrewersTax(address brewer) public view returns (uint256) {
        uint256 class = IClassManager(settings.classManager()).getClass(brewer);
        return settings.classTaxes(class);
    }

    /**
     * @notice Handles the specific claiming of MEAD and distributing it to the rewards pool and the treasury
     */
    function _claim(uint256 amount) internal {
        if (amount == 0) return;

        uint256 claimTax = getBrewersTax(msg.sender);
        uint256 treasuryAmount = amount * claimTax / 1e4;
        uint256 rewardAmount = amount - treasuryAmount;

        // Transfer the resulting mead from the rewards pool to the user
        // Transfer the taxed portion of mead from the rewards pool to the treasury
        IERC20Upgradeable mead = IERC20Upgradeable(settings.mead());
        mead.safeTransferFrom(settings.rewardsPool(), msg.sender, rewardAmount);
        mead.safeTransferFrom(settings.rewardsPool(), settings.tavernsKeep(), treasuryAmount);

        emit Claim(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Claims the rewards from a specific node
     */
    function claim() public {
        HomekitStats storage stat = homekits[msg.sender];
        // Award MEAD tokens
        uint256 totalRewards = pendingMead(msg.sender);
        if (totalRewards > 0) {
            // Handles the token transfer
            _claim(totalRewards);
            
            // Increase the yield of this user
            stat.totalYield += totalRewards;
            stat.pendingYields = 0;
        }

        // Reset the claim timer so that individuals have to wait past the fermentation period again
        stat.lastTimeClaimed = block.timestamp;
    }


    /**
     * @notice Compounds all pending MEAD into new Homekits!
     */
    function compoundAll() external {
        uint256 totalRewards = pendingMead(msg.sender);
        uint256 homekitCount = totalRewards / homekitPrice;
        require(homekitCount > 0, "You dont have enough pending MEAD");
        compound(homekitCount);
    }

    /**
     * @notice Compounds MEAD
     */
    function compound(uint256 _count) public {
        uint256 totalCost = _count * homekitPrice;
        uint256 totalRewards = pendingMead(msg.sender);

        // If the taken mead isn't above the total cost for this transaction, then entirely revert
        require(totalRewards >= totalCost, "You dont have enough pending MEAD");

        _createTo(msg.sender, _count);

        // Send the treasury cut
        IERC20Upgradeable mead = IERC20Upgradeable(settings.mead());
        mead.safeTransferFrom(settings.rewardsPool(), settings.tavernsKeep(), totalCost * settings.treasuryFee() / 1e4);

        // Claim any leftover tokens over to the user
        _claim(totalRewards - totalCost);
        homekits[msg.sender].pendingYields = 0;
        homekits[msg.sender].lastTimeClaimed = block.timestamp;
    }

    //////////////////////////////////////////////////////////////
    //                                                          //
    //                         Setter                           //
    //                                                          //
    //////////////////////////////////////////////////////////////

    function setSettings(address _settings) external onlyRole(DEFAULT_ADMIN_ROLE) {
        settings = TavernSettings(_settings);
    }
    
    function setStartTime(uint256 _startTime) external onlyRole(DEFAULT_ADMIN_ROLE) {
        startTime = _startTime;
    }

    function setProductionRatePerSecond(uint256 _value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        productionRatePerSecond = _value;
    }

    function setHomekitWalletLimit(uint256 _limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        homekitWalletLimit = _limit;
    }

    function setHomekitPrice(uint256 _price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        homekitPrice = _price;
    }

    function setMaxLiquidityDiscount(uint256 _discount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        lpDiscount0 = _discount;
    }

    function setMinLiquidityDiscount(uint256 _discount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        lpDiscount1 = _discount;
    }

    function setMinLiquidityRatio(uint256 _ratio) external onlyRole(DEFAULT_ADMIN_ROLE) {
        liquidityRatio0 = _ratio;
    }

    function setMaxLiquidityRatio(uint256 _ratio) external onlyRole(DEFAULT_ADMIN_ROLE) {
        liquidityRatio1 = _ratio;
    }

    function setLPEnabled(bool _b) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isLPEnabled = _b;
    }
}