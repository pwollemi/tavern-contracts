pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import "../TavernSettings.sol";
import "../ERC-721/Brewery.sol";
import "../ERC-20/Mead.sol";
import "../BreweryPurchaseHelper.sol";

/**
 * @notice There are some conditions to make this work
 *
 *  - Trader needs to have approval of the users BREWERY
 *  - Helper should be able to burn xMEAD
 *  - Helper should be able to award reputation
 *
 */
contract TavernEscrowTrader is Initializable, OwnableUpgradeable, ERC721HolderUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice The data contract containing all of the necessary settings
    TavernSettings public settings;

    /// @notice The mead smart contract, maybe you just need IERC20Upgradeable interface
    Mead public mead;

    /// @notice The brewery smart contract, maybe you just need IERC721Upgradeable interface
    Brewery public brewery;

    enum OrderStatus {
        Active,
        Canceled,
        Sold
    }

    struct Order {
        uint256 id;
        OrderStatus status;
        uint256 tokenId;
        address seller;
        address buyer;
        uint256 price;
    }

    /// @notice A mapping from order id to order data
    /// @dev This is a static, ever increasing list
    mapping(uint256 => Order) public orders;

    /// @notice The amount of orders
    uint256 public orderCount;

    /// @notice Mapping from owner to a list of owned auctions
    mapping(address => uint256[]) public ownedOrders;

    /// @notice Mapping from bought 
    mapping(address => uint256[]) public boughtOrders;

    /// @notice How much it costs to cancel an order
    uint256 public cancellationFee;

    /// @notice The brewery purchase helper
    address public breweryPurchaseHelper;

    event OrderAdded(
        uint256 indexed id,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 price
    );

    event OrderUpdated(uint256 indexed id, uint256 price);

    event OrderCanceled(uint256 indexed id);

    event OrderBought(uint256 indexed id, address indexed buyer);

    function initialize(
        TavernSettings _settings,
        Mead _mead,
        Brewery _brewery
    ) external initializer {
        __Ownable_init();
        __ERC721Holder_init();

        settings = _settings;
        mead = _mead;
        brewery = _brewery;
    }

    receive() external payable {
    }

    function withdraw() external payable onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function withdrawToken(address token) external payable onlyOwner {
        IERC20Upgradeable(token).transfer(owner(), IERC20Upgradeable(token).balanceOf(address(this)));
    }

    /**
     * @notice Transfers a BREWERY to another individual
     */
    function transfer(address to, uint256 tokenId) external {
        brewery.transferFrom(msg.sender, address(this), tokenId);
        brewery.transferFrom(address(this), to, tokenId);
    }

    function setCancellationFee(uint256 fee) external onlyOwner {
        cancellationFee = fee;
    }

    function setBreweryPurchaseHelper(address purchaseHelper) external onlyOwner {
        breweryPurchaseHelper = purchaseHelper;
    }

    /**
     * @notice Creates an order, transfering into th
     */
    function createOrder(uint256 tokenId, uint256 price) external {
        // the function return the address of the owner
        require(brewery.ownerOf(tokenId) == msg.sender, "Not owner of token");
        require(price > 0, "The price need to be more than 0");

        // Transfer the brewery into the escrow contract
        brewery.safeTransferFrom(msg.sender, address(this), tokenId);

        // Create the order
        orders[orderCount] = Order({
            id: orderCount,
            status: OrderStatus.Active,
            tokenId: tokenId,
            seller: msg.sender,
            buyer: address(0),
            price: price
        });

        ownedOrders[msg.sender].push(orderCount);

        emit OrderAdded(orderCount, msg.sender, tokenId, price);

        orderCount++;
    }

    /**
     * @notice Updates the price of a listed orders
     */
    function updateOrder(uint256 orderId, uint256 price) external {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.Active,
            "Order is no longer available!"
        );
        require(order.seller == msg.sender, "Only the seller can update order");
        require(price > 0, "The price need to be more than 0");
        order.price = price;

        emit OrderUpdated(orderId, price);
    }

    /**
     * @notice Cancels a currently listed order, returning the BREWERY to the owner
     */
    function cancelOrder(uint256 orderId) external payable {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.Active,
            "Order is no longer available!"
        );
        require(order.seller == msg.sender, "Only the seller can cancel order");
        require(msg.value == cancellationFee, "Need to pay fee to cancel order");

        // Transfer the brewery back to the seller
        brewery.safeTransferFrom(address(this), order.seller, order.tokenId);

        // Mark order
        order.status = OrderStatus.Canceled;

        emit OrderCanceled(orderId);
    }

    /**
     * @notice Purchases an active order
     * @dev    `amount` is needed to ensure buyer isnt frontrun
     */
    function buyOrder(uint256 orderId, uint256 amount) external {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.Active,
            "Order is no longer available!"
        );
        require(order.price == amount, "Amount isn't equal to price!");

        // Handle the transfer of payment
        // - Transfer 85% to the seller
        // - Of the 15% taxed:
        //   - 70% goes to rewards pool
        //   - 30% goes to the treasury
        uint256 taxAmount = (order.price * settings.marketplaceMeadFee()) / 1e4;
        uint256 sellerAmount = order.price - taxAmount;
        uint256 treasuryAmount = (taxAmount * settings.treasuryFee()) / 1e4;
        uint256 rewardPoolAmount = taxAmount - treasuryAmount;

        IERC20Upgradeable(mead).safeTransferFrom(msg.sender, settings.tavernsKeep(), treasuryAmount);
        IERC20Upgradeable(mead).safeTransferFrom(msg.sender, settings.rewardsPool(), rewardPoolAmount);
        IERC20Upgradeable(mead).safeTransferFrom(msg.sender, order.seller, sellerAmount);

        // Claim any remaining MEAD on the brewery before passing it back over
        brewery.claim(order.tokenId);

        // Transfer the brewery to the buyer
        brewery.safeTransferFrom(address(this), msg.sender, order.tokenId);

        // Remove the order from the active list
        boughtOrders[msg.sender].push(orderId);

        // Mark order
        order.buyer = msg.sender;
        order.status = OrderStatus.Sold;

        emit OrderBought(orderId, msg.sender);
    }

    /**
     * @notice Purchases an active order
     * @dev    `amount` is needed to ensure buyer isnt frontrun
     */
    function buyOrderWithUSDC(uint256 orderId, uint256 amount) external {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.Active,
            "Order is no longer available!"
        );
        require(order.price == amount, "Amount isn't equal to price!");

        // Handle the transfer of payment
        // - Transfer 75% to the seller
        // - Transfer 25% treasury
        uint256 orderAmountUSDC = BreweryPurchaseHelper(breweryPurchaseHelper).getUSDCForMead(order.price);
        uint256 taxAmountUSDC = (orderAmountUSDC * settings.marketplaceFee()) / 1e4;
        IERC20Upgradeable(settings.usdc()).safeTransferFrom(msg.sender, settings.tavernsKeep(), taxAmountUSDC);
        IERC20Upgradeable(settings.usdc()).safeTransferFrom(msg.sender, order.seller, orderAmountUSDC - taxAmountUSDC);

        // Claim any remaining MEAD on the brewery before passing it back over
        brewery.claim(order.tokenId);

        // Transfer the brewery to the buyer
        brewery.safeTransferFrom(address(this), msg.sender, order.tokenId);

        // Remove the order from the active list
        boughtOrders[msg.sender].push(orderId);

        // Mark order
        order.buyer = msg.sender;
        order.status = OrderStatus.Sold;

        emit OrderBought(orderId, msg.sender);
    }

    function countUserOrders(address user) public view returns (uint256) {
        return ownedOrders[user].length;
    }

    function countUserBought(address user) public view returns (uint256) {
        return boughtOrders[user].length;
    }

    function fetchPageOrders(uint256 cursor, uint256 howMany)
        public
        view
        returns (Order[] memory values, uint256 newCursor)
    {
        uint256 length = howMany;
        if (length > orderCount - cursor) {
            length = orderCount - cursor;
        }

        values = new Order[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = orders[cursor + i];
        }

        return (values, cursor + length);
    }

    function fetchPageOwned(
        address user,
        uint256 cursor,
        uint256 howMany
    ) public view returns (Order[] memory values, uint256 newCursor) {
        uint256 length = howMany;
        uint256[] storage owned = ownedOrders[user];
        if (length > owned.length - cursor) {
            length = owned.length - cursor;
        }

        values = new Order[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 index = owned[cursor + i];
            values[i] = orders[index];
        }

        return (values, cursor + length);
    }

    function fetchPageBought(
        address user,
        uint256 cursor,
        uint256 howMany
    ) public view returns (Order[] memory values, uint256 newCursor) {
        uint256 length = howMany;
        uint256[] storage bought = boughtOrders[user];
        if (length > bought.length - cursor) {
            length = bought.length - cursor;
        }

        values = new Order[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 index = bought[cursor + i];
            values[i] = orders[index];
        }

        return (values, cursor + length);
    }
}