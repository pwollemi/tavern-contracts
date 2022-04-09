pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./TavernSettings.sol";
import "./ERC-721/Brewery.sol";
import "./ClassManager.sol";
import "./ERC-20/xMead.sol";
import "./ERC-20/Mead.sol";
import "./TavernStaking.sol";

/**
 * @notice There are some conditions to make this work
 * 
 *  - Helper needs to be the owner of Brewery
 *  - Helper should be able to burn xMEAD
 *  - Helper should be able to award reputation
 * 
 */
contract BreweryPurchaseHelper is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice The data contract containing all of the necessary settings
    TavernSettings public settings;

    /// @notice Brewery contract
    Brewery public brewery;

    /// @notice Whether or not the USDC payments have been enabled (based on the treasury)
    bool public isUSDCEnabled;

    /// @notice Whether or not the LP payments have been enabled
    bool public isLPEnabled;

    /// @notice The amount of discount of USDC
    uint256 public usdcDiscount;
    
    /// @notice The upper liquidity ratio (when to apply the higher discount)
    uint256 public liquidityRatio0;

    /// @notice The lower liquidity ratio (when to apply the lower discount)
    uint256 public liquidityRatio1;

    /// @notice The discount (to be applied when the liquidity ratio is equal to or above `liquidityRatio0`)
    uint256 public lpDiscount0;

    /// @notice The discount (to be applied when the liquidity ratio is equal to or less than `liquidityRatio1`)
    uint256 public lpDiscount1;

    /// @notice Liquidity zapping slippage
    uint256 public zapSlippage;

    /// @notice The percentage fee for using the auto-zapping! 
    uint256 public zapFee;

    /// @notice Relevant events to emit
    event Redeemed(address account, uint256 amount);

    /// @notice The amount of discount to apply to people converting staked LP
    uint256 public conversionDiscount;

    /// @notice How long people have to have their LP tokens staked before 
    uint256 public conversionPeriodRequirement;

    function initialize(address _settings, address _brewery) external initializer {
        __Ownable_init();

        // Store the settings
        settings = TavernSettings(_settings);
        brewery = Brewery(_brewery);

        usdcDiscount = 500;     // 5%
        liquidityRatio0 = 100;  // 1%
        liquidityRatio1 = 2000; // 20%
        lpDiscount0 = 2500;     // 25%
        lpDiscount1 = 100;      // 1%
        zapSlippage = 1000;     // 10%
        zapFee = 100;           // 1%
    }

    /**
     * ===========================================================
     *            INTERFACE
     * ============================================================
     */

    /**
     * @notice Handles the actual minting logic
     */
    function _mint(address account, string memory name, uint256 reputation) internal {
        brewery.mint(account, name);
        ClassManager(settings.classManager()).addReputation(msg.sender, reputation);
    }

    // function _mintWithSkin(address account, string memory name, uint256 reputation, uint256 skinId) internal {
        
    //     renovation.create(account, items[id].renovationType, items[id].intValue, items[id].strValue);

    //     brewery.mint(account, name);
    //     ClassManager(settings.classManager()).addReputation(msg.sender, reputation);
    // }

    /**
     * @notice Purchases a BREWERY using MEAD
     */
    function purchaseWithXMead(uint256 amount) external {
        require(amount > 0, "Amount must be above zero");
        require(amount <= settings.txLimit(), "Cant go above tx limit!");

        uint256 xMeadAmount = amount * settings.xMeadCost();
        XMead(settings.xmead()).redeem(msg.sender, xMeadAmount);

        // Mint logic
        for (uint256 i = 0; i < amount; ++i) {
            _mint(msg.sender, "", settings.reputationForMead());
        }
    }

    /**
     * @notice Purchases a BREWERY using MEAD
     */
    function purchaseWithMead(uint256 amount) public {
        require(amount > 0, "Amount must be above zero");
        require(amount <= settings.txLimit(), "Cant go above tx limit!");

        uint256 meadAmount = amount * settings.breweryCost();
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.tavernsKeep(), meadAmount * settings.treasuryFee() / settings.PRECISION());
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.rewardsPool(), meadAmount * settings.rewardPoolFee() / settings.PRECISION());

        // Mint logic
        for (uint256 i = 0; i < amount; ++i) {
            _mint(msg.sender, "", settings.reputationForMead());
        }
    }

    /**
     * @notice Purchases a BREWERY using USDC
     */
    function purchaseWithUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be above zero");
        require(amount <= settings.txLimit(), "Cant go above tx limit!");
        require(isUSDCEnabled, "USDC discount off");

        // Take payment for USDC tokens
        uint256 usdcAmount = amount * getUSDCForMead(settings.breweryCost()) * (settings.PRECISION() - usdcDiscount) / settings.PRECISION();
        IERC20Upgradeable(settings.usdc()).safeTransferFrom(msg.sender, settings.tavernsKeep(), usdcAmount);

        // Mint logic
        for (uint256 i = 0; i < amount; ++i) {
            _mint(msg.sender, "", settings.reputationForUSDC());
        }
    }
    
    /**
     * @notice Purchases a BREWERY using LP tokens
     */
    function purchaseWithLP(uint256 amount) public {
        require(amount > 0, "Amount must be above zero");
        require(amount <= settings.txLimit(), "Cant go above tx limit!");
        require(isLPEnabled, "LP discount off");

        // Take payment in MEAD-USDC LP tokens
        uint256 discount = calculateLPDiscount();
        uint256 breweryPriceInUSDC = amount * getUSDCForMead(settings.breweryCost());
        uint256 breweryPriceInLP = getLPFromUSDC(breweryPriceInUSDC);
        uint256 discountAmount = breweryPriceInLP * discount / 1e4;
        IJoePair(settings.liquidityPair()).transferFrom(msg.sender, settings.tavernsKeep(), breweryPriceInLP - discountAmount);

        // Mint logic
        for (uint256 i = 0; i < amount; ++i) {
            _mint(msg.sender, "", settings.reputationForLP());
        }
    }

    /**
     * @notice Returns the price of a BREWERY in USDC, factoring in the LP discount
     */
    function getBreweryCostWithLPDiscount(uint256 _amount) public view returns (uint256) {
        uint256 discount = calculateLPDiscount();

        // Get the price of a brewery as if it were valued at the LP tokens rate + a fee for automatically zapping for you
        // Bear in mind this will still be discounted even though we take an extra fee!
        uint256 breweryCost = _amount * getUSDCForMead(settings.breweryCost());
        return breweryCost - breweryCost * (discount - zapFee) / 1e4;

    }

    /**
     * @notice Returns the price of a BREWERY in USDC, factoring in both LP + stake conversion discounts
     */
    function getBreweryCostWithLPAndConvertDiscount(uint256 _amount) public view returns (uint256) {
        uint256 cost = getBreweryCostWithLPDiscount(_amount);
        return cost - cost * conversionDiscount / 1e4;
    }

    /**
     * @notice Purchases a BREWERY using USDC and automatically converting into LP tokens 
     */
    function purchaseWithLPUsingZap(uint256 _amount) external {
        uint256 breweryCostWithLPDiscount = getBreweryCostWithLPDiscount(_amount);

        /// @notice Handles the zapping of liquitity for us + an extra fee
        /// @dev The LP tokens will now be in the hands of the msg.sender
        uint256 liquidityTokens = zapLiquidity(breweryCostWithLPDiscount);

        // Send the tokens from the account transacting this function to the taverns keep
        settings.liquidityPair().transferFrom(msg.sender, settings.tavernsKeep(), liquidityTokens);

        // Mint logic
        for(uint256 i = 0; i < _amount; ++i) {
            _mint(msg.sender, "", settings.reputationForLP());
        }
    }

    /**
     * @notice Compounds the staking pending MEAD rewards into BREWERYs
     */
    function compoundPendingStakeRewardsIntoBrewerys(address stakingAddress) external {
        TavernStaking staking = TavernStaking(stakingAddress);
        uint256 pendingRewards = staking.pendingRewards(msg.sender);

        // Calculate the cost of a BREWERY for compounding (with converting)
        uint256 breweryCostWithDiscount = settings.breweryCost() - settings.breweryCost() * conversionDiscount / 1e4;
        require(pendingRewards >= breweryCostWithDiscount, "Not enough rewards to compound");

        // Withdraw the rewards
        uint256 balanceBefore = Mead(settings.mead()).balanceOf(msg.sender);
        TavernStaking(stakingAddress).harvest(msg.sender);
        uint256 claimed = Mead(settings.mead()).balanceOf(msg.sender) - balanceBefore;

        // Find out how many brewerys we can afford
        uint256 breweryAmount = claimed / breweryCostWithDiscount;

        require(breweryAmount > 0, "Not enough rewards to compound");

        uint256 meadAmount = breweryAmount * breweryCostWithDiscount;

        // Mint logic
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.tavernsKeep(), meadAmount * settings.treasuryFee() / settings.PRECISION());
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.rewardsPool(), meadAmount * settings.rewardPoolFee() / settings.PRECISION());

        // Mint logic
        for (uint256 i = 0; i < breweryAmount; ++i) {
            _mint(msg.sender, "", settings.reputationForMead());
        }
    }

    /**
     * @notice Converts staked LPs into BREWERYs
     */
    function convertStakeIntoBrewerys(address stakingAddress, uint256 stakeAmount) external {
        TavernStaking staking = TavernStaking(stakingAddress);
        (uint256 amount,,,uint256 lastTimeDeposited) = staking.userInfo(msg.sender);
        require(stakeAmount <= amount, "You havent staked this amount");
        require(lastTimeDeposited + conversionPeriodRequirement <= block.timestamp, "Need to stake for longer to convert");

        // Attempt to withdraw the stake via the staking contract
        // This gives msg.sender LP tokens + MEAD rewards
        TavernStaking(stakingAddress).withdrawOnBehalf(msg.sender, stakeAmount);

        // Calculate how many BREWERYs this affords
        // stakeAmount         100 000000000000000000
        // lpPriceUSD          100 000000
        // stakeAmountUSD      100 000000
        // breweryCostUSD      600 000000
        // breweryAmount       6
        // toPayLP             breweryAmount * breweryCostUSD / lpPriceUSD
        //                     6             * 600 000000     / 100 000000
        //                     12
        uint256 discount = calculateLPDiscount();
        uint256 breweryPriceInUSDC = getUSDCForMead(settings.breweryCost());
        uint256 breweryPriceInLP = getLPFromUSDC(breweryPriceInUSDC);
        uint256 discountedPrice = breweryPriceInLP * (1e4 - discount) / 1e4;
        discountedPrice = discountedPrice - discountedPrice * conversionDiscount / 1e4;
        uint256 breweryAmount = stakeAmount / discountedPrice;

        // Send the LP tokens from the account transacting this function to the taverns keep
        // as payment. The rest is then kept on the person (dust)
        uint256 toPayLP = breweryAmount * discountedPrice;
        settings.liquidityPair().transferFrom(msg.sender, settings.tavernsKeep(), toPayLP);

        // Mint `breweryAmount`
        for (uint256 i = 0; i < breweryAmount; ++i) {
            _mint(msg.sender, "", settings.reputationForLP());
        }
    }

    /**
     * @notice Function that calculates how many BREWERYs you can purchase for `amount`
     */
    function getBreweryAmountFromLP(uint256 amount) public view returns (uint256) {
        uint256 lpPrice = getUSDCForOneLP();
        uint256 lpValue = amount * lpPrice;
        uint256 costOfOneBrewery = getBreweryCostWithLPDiscount(1);
        return lpValue / costOfOneBrewery;
    }

    /**
     * @notice Takes an amount of USDC and zaps it into liquidity
     * @dev User must have an approved MEAD and USDC allowance on this contract
     * @return The liquidity token balance
     */
    function zapLiquidity(uint256 usdcAmount) public returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = settings.usdc();
        path[1] = settings.mead();

        // Swap any USDC to receive 50 MEAD
        IERC20Upgradeable(settings.usdc()).safeTransferFrom(msg.sender, address(this), usdcAmount);
        IERC20Upgradeable(settings.usdc()).approve(address(settings.dexRouter()), usdcAmount);
        uint[] memory amounts = settings.dexRouter().swapExactTokensForTokens(
            usdcAmount / 2, 
            0, 
            path,
            address(this),
            block.timestamp + 120
        );

        // Approve the router to spend these tokens 
        IERC20Upgradeable(settings.usdc()).approve(address(settings.dexRouter()), amounts[0]);
        IERC20Upgradeable(settings.mead()).approve(address(settings.dexRouter()), amounts[1]);

        // Add liquidity (MEAD + USDC) to receive LP tokens
        (, , uint liquidity) = settings.dexRouter().addLiquidity(
            settings.usdc(),
            settings.mead(),
            amounts[0],
            amounts[1],
            0,
            0,
            msg.sender,
            block.timestamp + 120
        );

        return liquidity;
    }

    /**
     * @notice Unzaps the liquidity
     * @return The liquidity token balance
     */
    function unzapLiquidity(uint256 _amount) public returns (uint256, uint256) {
        // Approve the router to spend these tokens 
        //IERC20Upgradeable(settings.usdc()).approve(address(settings.dexRouter()), type(uint256).max);
        //IERC20Upgradeable(settings.mead()).approve(address(settings.dexRouter()), type(uint256).max);

        // Remove liquidity (MEAD + USDC) to receive LP tokens
        return settings.dexRouter().removeLiquidity(
            settings.usdc(),
            settings.mead(),
            _amount,
            0,
            0,
            msg.sender,
            block.timestamp + 120
        );
    }

    function getMeadSupply() public view returns (uint256) {
        return Mead(settings.mead()).totalSupply() / 10**ERC20Upgradeable(settings.mead()).decimals();
    }

    function getFDV() public view returns (uint256) {
        return getUSDCForOneMead() * getMeadSupply();
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
     * @notice Calculates how much USDC 1 LP token is worth
     */
    function getUSDCForOneLP() public view returns (uint256) {
        uint256 lpSupply = settings.liquidityPair().totalSupply();
        uint256 totalReserveInUSDC = getUSDCReserve() * 2;
        return totalReserveInUSDC * 10 ** settings.liquidityPair().decimals() / lpSupply;
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
     * @notice Returns how many USDC tokens you need for inputed meadAmount
     */
    function getUSDCForMead(uint256 meadAmount) public view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = settings.usdc();
        path[1] = settings.mead();
        uint256[] memory amountsOut = settings.dexRouter().getAmountsIn(meadAmount, path);
        return amountsOut[0];
    }

    /**
     * @notice Returns how many USDC tokens you need for inputed meadAmount
     */
    function getUSDCForOneMead() public view returns (uint256) {
        return getUSDCForMead(10 ** ERC20Upgradeable(settings.mead()).decimals());
    }

    /**
     * ===========================================================
     *            ADMIN FUNCTIONS
     * ============================================================
     */
     
    /**
     * @notice Withdraws stuck ERC-20 tokens from the contract
     */
    function withdrawToken(address _token) external payable onlyOwner {
        IERC20Upgradeable(_token).transfer(owner(), IERC20Upgradeable(_token).balanceOf(address(this)));
    }
    
    function setUSDCEnabled(bool _b) external onlyOwner {
        isUSDCEnabled = _b;
    }

    function setLPEnabled(bool _b) external onlyOwner {
        isLPEnabled = _b;
    }

    function setUSDCDiscount(uint256 _discount) external onlyOwner {
        usdcDiscount = _discount;
    }

    function setMaxLiquidityDiscount(uint256 _discount) external onlyOwner {
        lpDiscount0 = _discount;
    }

    function setMinLiquidityDiscount(uint256 _discount) external onlyOwner {
        lpDiscount1 = _discount;
    }

    function setMinLiquidityRatio(uint256 _ratio) external onlyOwner {
        liquidityRatio0 = _ratio;
    }

    function setMaxLiquidityRatio(uint256 _ratio) external onlyOwner {
        liquidityRatio1 = _ratio;
    }

    function setZapSlippage(uint256 _zap) external onlyOwner {
        zapSlippage = _zap;
    }

    function setConversionDiscount(uint256 _discount) external onlyOwner {
        conversionDiscount = _discount;
    }

    function setConversionPeriodRequirement(uint256 _requirement) external onlyOwner {
        conversionPeriodRequirement = _requirement;
    }
}