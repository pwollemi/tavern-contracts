pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "@traderjoe-xyz/core/contracts/traderjoe/interfaces/IJoeRouter02.sol";
import "@traderjoe-xyz/core/contracts/traderjoe/interfaces/IJoeFactory.sol";
import "@traderjoe-xyz/core/contracts/traderjoe/interfaces/IJoePair.sol";

import "./interfaces/IClassManager.sol";

contract TavernSettings is Initializable, OwnableUpgradeable {
    /// @notice Used to give 2dp precision for percentages
    uint256 public constant PRECISION = 1e4;

    /// @notice The contract for xMEAD
    address public xmead;

    /// @notice The contract for MEAD
    address public mead;

    /// @notice The contract for USDC
    address public usdc;

    /// @notice The contract for xMEAD redeemer helper
    address public redeemer;

    /// @notice The contract for the class manager
    address public classManager;

    /// @notice The contract of the TraderJoe router
    IJoeRouter02 public dexRouter;

    /// @notice The contract of the TraderJoe liquidity pair
    IJoePair public liquidityPair;

    /// @notice The wallet address of the governing treasury
    address public tavernsKeep;

    /// @notice The wallet address of the rewards pool
    address public rewardsPool;

    /// @notice The wallet address of the xMead redeem treasury
    address public redeemPool;

    /// @notice The fee that is given to treasuries
    uint256 public treasuryFee;

    /// @notice The fee that is given to rewards pool
    uint256 public rewardPoolFee;

    /// @notice The amount of wallets that can be bought in one transaction
    uint256 public txLimit;

    /// @notice The limit of the amount of BREWERYs per wallet
    uint256 public walletLimit;

    /// @notice The cost of a BREWERY in MEAD tokens
    uint256 public breweryCost;

    /// @notice The cost of BREWERY in xMEAD tokens
    uint256 public xMeadCost;

    /// @notice The address for the renovation
    address public renovationAddress;

    /// @notice The list of class taxes associated with each class
    /// @dev classTaxes.length === ClassManager::classThresholds.length 
    uint256[] public classTaxes;

    /// @notice The amount of reputation gained for buying a BREWERY with MEAD
    uint256 public reputationForMead;

    /// @notice The amount of reputation gained for buying a BREWERY with USDC
    uint256 public reputationForUSDC;

    /// @notice The amount of reputation gained for buying a BREWERY with LP tokens
    uint256 public reputationForLP;

    /// @notice The amount of reputation gained for every day the person didn't claim past the fermentation period
    uint256 public reputationForClaimPerDay;

    /// @notice The amount of reputation gained per LP token, ignore decimals, accuracy is PRECISION
    uint256 public reputationPerStakingLP;

    /// @notice The fee to apply on AVAX/USDC purchases
    uint256 public marketplaceFee;

    /// @notice The fee to apply on MEAD purchases
    uint256 public marketplaceMeadFee;

    function initialize(
        address _xmead, 
        address _mead, 
        address _usdc, 
        address _classManager,
        address _routerAddress,
        uint256[] memory _classTaxes
    ) external initializer {
        __Ownable_init();
        __Context_init();

        uint256 classCount = IClassManager(_classManager).getClassCount();
        require(classCount > 0, "Class manager not configured!");
        require(_classTaxes.length == classCount, "Class tax array length isnt right");

        // Set up the tavern contracts
        xmead = _xmead;
        mead = _mead;
        usdc = _usdc;
        classManager = _classManager;

        // Set up the router and the liquidity pair
        dexRouter     = IJoeRouter02(_routerAddress);
        liquidityPair = IJoePair(IJoeFactory(dexRouter.factory()).getPair(_mead, _usdc));

        // Set default settings
        breweryCost = 100 * 10**ERC20Upgradeable(mead).decimals();
        xMeadCost   = 90 * 10**ERC20Upgradeable(xmead).decimals();

        // Default taxes
        classTaxes = _classTaxes;

        treasuryFee = PRECISION * 70 / 100;
        rewardPoolFee = PRECISION * 30 / 100;
    }

    /**
     * ================================================================
     *                          SETTERS
     * ================================================================
     */
    function setTavernsKeep(address _tavernsKeep) external onlyOwner {
        tavernsKeep = _tavernsKeep;
    }

    function setRewardsPool(address _rewardsPool) external onlyOwner {
        rewardsPool = _rewardsPool;
    }

    function setRedeemPool(address _redeemPool) external onlyOwner {
        redeemPool = _redeemPool;
    }

    function setTreasuryFee(uint256 _treasuryFee) external onlyOwner {
        treasuryFee = _treasuryFee;
    }

    function setRewardPoolFee(uint256 _rewardPoolFee) external onlyOwner {
        rewardPoolFee = _rewardPoolFee;
    }

    function setXMead(address _xMead) external onlyOwner {
        xmead = _xMead;
    }

    function setMead(address _mead) external onlyOwner {
        mead = _mead;
    }

    function setUSDC(address _usdc) external onlyOwner {
        usdc = _usdc;
    }

    function setRedeemer(address _redeemer) external onlyOwner {
        redeemer = _redeemer;
    }

    function setClassManager(address _classManager) external onlyOwner {
        classManager = _classManager;
    }

    function setTxLimit(uint256 _txLimit) external onlyOwner {
        txLimit = _txLimit;
    }

    function setWalletLimit(uint256 _walletLimit) external onlyOwner {
        walletLimit = _walletLimit;
    }

    function setBreweryCost(uint256 _breweryCost) external onlyOwner {
        breweryCost = _breweryCost;
    }

    function setXMeadCost(uint256 _xMeadCost) external onlyOwner {
        xMeadCost = _xMeadCost;
    }

    function setRenovationAddress(address _renovationAddress) external onlyOwner {
        renovationAddress = _renovationAddress;
    }

    function clearClassTaxes() external onlyOwner {
        delete classTaxes;
    }

    function addClassTax(uint256 _tax) external onlyOwner {
        classTaxes.push(_tax);
    }

    function setReputationForMead(uint256 _amount) external onlyOwner {
        reputationForMead = _amount;
    }

    function setReputationForUSDC(uint256 _amount) external onlyOwner {
        reputationForUSDC = _amount;
    }

    function setReputationForLP(uint256 _amount) external onlyOwner {
        reputationForLP = _amount;
    }

    function setReputationForClaimPerDay(uint256 _amount) external onlyOwner {
        reputationForClaimPerDay = _amount;
    }

    function setReputationPerStakingLP(uint256 _amount) external onlyOwner {
        reputationPerStakingLP = _amount;
    }
    
    function setMarketplaceFee(uint256 _amount) external onlyOwner {
        marketplaceFee = _amount;
    }

    function setMarketplaceMeadFee(uint256 _amount) external onlyOwner {
        marketplaceMeadFee = _amount;
    }
}