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

/**
 * @notice There are some conditions to make this work
 * 
 *  - Helper needs to be the owner of Brewery
 *  - Helper should be able to burn xMEAD
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

    function initialize(address _settings, address _brewery) external initializer {
        __Ownable_init();

        // Store the settings
        settings = TavernSettings(_settings);
        brewery = Brewery(_brewery);

        usdcDiscount = 5 * settings.PRECISION() / 100;
        liquidityRatio0 = 1 * settings.PRECISION() / 100;
        liquidityRatio1 = 20 * settings.PRECISION() / 100;
        lpDiscount0 = 1 * settings.PRECISION() / 100;
        lpDiscount1 = 25 * settings.PRECISION() / 100;
        zapSlippage = 10 * settings.PRECISION() / 100;
        zapFee = 1 * settings.PRECISION() / 100;
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

    /**
     * @notice Purchases a BREWERY using MEAD
     */
    function purchaseWithXMead(string memory name) external {

        uint256 xMeadAmount = settings.xMeadCost();
        XMead(settings.xmead()).redeem(msg.sender, xMeadAmount);
        IERC20Upgradeable(settings.mead()).safeTransferFrom(settings.redeemPool(), settings.tavernsKeep(), xMeadAmount * settings.treasuryFee() / settings.PRECISION());
        IERC20Upgradeable(settings.mead()).safeTransferFrom(settings.redeemPool(), settings.rewardsPool(), xMeadAmount * settings.rewardPoolFee() / settings.PRECISION());

        // Mint logic
        _mint(msg.sender, name, settings.reputationForMead());
    }
    
    /**
     * @notice Purchases a BREWERY using MEAD
     */
    function purchaseWithMead(string memory name) external {
        uint256 meadAmount = settings.breweryCost();
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.tavernsKeep(), meadAmount * settings.treasuryFee() / settings.PRECISION());
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, settings.rewardsPool(), meadAmount * settings.rewardPoolFee() / settings.PRECISION());

        // Mint logic
        _mint(msg.sender, name, settings.reputationForMead());
    }

    /**
     * @notice Purchases a BREWERY using USDC
     */
    function purchaseWithUSDC(string memory name) external {
        require(isUSDCEnabled, "USDC discount off");

        // Take payment for USDC tokens
        uint256 usdcAmount = getUSDCForMead(settings.breweryCost()) * (settings.PRECISION() - usdcDiscount) / settings.PRECISION();
        IERC20Upgradeable(settings.usdc()).safeTransferFrom(msg.sender, settings.tavernsKeep(), usdcAmount);

        // Mint logic
        _mint(msg.sender, name, settings.reputationForUSDC());
    }
    
    /**
     * @notice Purchases a BREWERY using LP tokens
     */
    function purchaseWithLP(string memory name) external {
        require(isLPEnabled, "USDC discount off");

        // Take payment in MEAD-USDC LP tokens
        uint256 discount = calculateLPDiscount();
        require(discount <= lpDiscount1, "LP discount off");
        uint256 breweryPriceInUSDC = getUSDCForMead(settings.breweryCost());
        uint256 breweryPriceInLP = getLPFromUSDC(breweryPriceInUSDC);
        settings.liquidityPair().transferFrom(msg.sender, settings.tavernsKeep(), breweryPriceInLP * (settings.PRECISION() - discount) / settings.PRECISION());

        // Mint logic
        _mint(msg.sender, name, settings.reputationForLP());
    }

    /**
     * @notice Purchases a BREWERY using USDC and automatically converting into LP tokens 
     */
    function purchaseWithLPUsingZap(string memory name) external {
        uint256 discount = calculateLPDiscount();
        uint256 discountMultiplier = (settings.PRECISION() - discount) / settings.PRECISION();
        uint256 zapFeeMultiplier = (settings.PRECISION() + zapFee) / settings.PRECISION();

        // Get the price of a brewery as if it were valued at the LP tokens rate + a fee for automatically zapping for you
        // Bear in mind this will still be discounted even though we take an extra fee!
        uint256 breweryPriceInUSDCWithLPDiscount = getUSDCForMead(settings.breweryCost()) * discountMultiplier * zapFeeMultiplier;

        /// @notice Handles the zapping of liquitity for us + an extra fee
        /// @dev The LP tokens will now be in the hands of the msg.sender
        uint256 liquidityTokens = zapLiquidity(breweryPriceInUSDCWithLPDiscount * (settings.PRECISION() + zapFee) / (settings.PRECISION()));

        // Send the tokens from the account transacting this function to the taverns keep
        settings.liquidityPair().transferFrom(msg.sender, settings.tavernsKeep(), liquidityTokens);

        // Mint logic
        _mint(msg.sender, name, settings.reputationForLP());
    }

    /**
     * @notice Takes an amount of USDC and zaps it into liquidity
     * @dev User must have an approved MEAD and USDC allowance on this contract
     * @return The liquidity token balance
     */
    function zapLiquidity(uint256 usdcAmount) public returns (uint256) {
        uint256 half = usdcAmount / 2;

        address[] memory path = new address[](2);
        path[0] = settings.mead();
        path[1] = settings.usdc();

        // Swap any USDC to receive 50 MEAD
        uint[] memory amounts = settings.dexRouter().swapExactTokensForTokens(
            half, 
            0, 
            path,
            msg.sender,
            block.timestamp + 120
        );

        // Transfer the tokens into the contract
        IERC20Upgradeable(settings.mead()).safeTransferFrom(msg.sender, address(this), amounts[0]);
        IERC20Upgradeable(settings.usdc()).safeTransferFrom(msg.sender, address(this), amounts[1]);

        // Approve the router to spend these tokens 
        IERC20Upgradeable(settings.mead()).approve(address(settings.dexRouter()), amounts[0]);
        IERC20Upgradeable(settings.usdc()).approve(address(settings.dexRouter()), amounts[1]);

        // Add liquidity (MEAD + USDC) to receive LP tokens
        (, , uint liquidity) = settings.dexRouter().addLiquidity(
            address(settings.mead()),
            address(settings.usdc()),
            amounts[0],
            amounts[1],
            amounts[0] * (settings.PRECISION() - zapSlippage) / settings.PRECISION(),
            amounts[1] * (settings.PRECISION() - zapSlippage) / settings.PRECISION(),
            msg.sender,
            block.timestamp + 120
        );

        return liquidity;
    }

    /**
     * @notice Calculates the current LP discount
     */
    function calculateLPDiscount() public view returns (uint256) {
        (, uint usdcReserves,) = settings.liquidityPair().getReserves();
        uint256 fullyDilutedValue = getUSDCForOneMead() * IERC20Upgradeable(settings.mead()).totalSupply();

        // If this is 5% its bad, if this is 20% its good
        uint256 liquidityRatio = usdcReserves * settings.PRECISION() / fullyDilutedValue / 100;

        if (liquidityRatio <= liquidityRatio0) {
            return lpDiscount1;
        }

        if (liquidityRatio >= liquidityRatio1) {
            return lpDiscount0;
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
    function setUSDCEnabled(bool _b) external onlyOwner {
        isUSDCEnabled = _b;
    }

    function setLPEnabled(bool _b) external onlyOwner {
        isLPEnabled = _b;
    }

    function setUSDCDiscount(uint256 _discount) external onlyOwner {
        usdcDiscount = _discount;
    }

    function setMinLiquidityDiscount(uint256 _discount) external onlyOwner {
        lpDiscount0 = _discount;
    }

    function setMaxLiquidityDiscount(uint256 _discount) external onlyOwner {
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
}