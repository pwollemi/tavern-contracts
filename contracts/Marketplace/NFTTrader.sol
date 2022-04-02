// pragma solidity ^0.8.4;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// import "../TavernSettings.sol";
// import "../ERC-721/Brewery.sol";
// import "../ERC-20/Mead.sol";
// /**
//  * @notice There are some conditions to make this work
//  * 
//  *  - Trader needs to have approval of the users BREWERY
//  *  - Helper should be able to burn xMEAD
//  *  - Helper should be able to award reputation
//  * 
//  */
// contract TavernEscrowTrader is Initializable, OwnableUpgradeable {
//     using SafeERC20Upgradeable for IERC20Upgradeable;

//     /// @notice The data contract containing all of the necessary settings
//     TavernSettings public settings;

//     /// @notice The mead smart contract
//     Mead public mead;

//     /// @notice The brewery smart contract
//     Brewery public brewery;

//     struct Order {
//         bool active;
//         uint256 tokenId;
//         address seller;
//         address buyer;
//         uint256 price;
//     }

//     /// @notice A mapping from order id to order data
//     /// @dev This is a static, ever increasing list
//     mapping (uint256 => Order) orders;

//     /// @notice The amount of orders
//     uint256 public orderCount;

//     /// @notice The mapping from owner to a list of owned order ids to order ids
//     /// @dev Used to enumerate orders
//     mapping (address => mapping (uint256 => uint256)) ownedOrders;

//     /// @notice The mapping from order ids to owned order ids
//     mapping (uint256 => uint256) ownedOrdersIndex;

//     /// @notice The mapping from owner to a count of how many orders this person has started
//     mapping (address => uint256) ownedOrderCount;

//     /// @notice The mapping of active order ids to order ids
//     /// @dev Used to enumerate active orders
//     mapping (uint256 => uint256) activeOrders;

//     /// @notice The amount of active orders
//     uint256 public activeOrderCount;


//     // /// @notice A mapping of active order IDs to token IDs
//     // mapping(uint256 => uint256) activeOrders;

//     // /// @notice A mapping of token IDs to active order IDs
//     // mapping(uint256 => uint256) activeOrderIds;

//     // /// @notice A mapping of sellers to their list of owned orders
//     // mapping(address => mapping(uint256 => uint256)) ownedOrders;

//     // /// @notice A mapping of token IDs to the order IDs
//     // mapping(uint256 => uint256) ownedOrdersIndex;

//     // /// @notice A mapping of token IDs to the index of the order
//     // mapping (uint256 => uint256) ownedOrderIds;

//     function initialize(address settings, address mead, address brewery) external initializer {
//         __Ownable_init();

//         settings = TavernSettings(settings);
//         mead = Mead(mead);
//         brewery = Brewery(brewery);
//     }

//     /**
//      * @notice Creates an order, transfering into th
//      */
//     function createOrder(uint256 tokenId, uint256 price) external {
//         require(brewery.ownerOf(tokenId) == true, "Not owner of token");

//         // Transfer the brewery into the escrow contract
//         brewery.safeTransferFrom(msg.sender, address(this), tokenId);

//         // Create the order
//         orders[orderCount] = Order({
//             active: true,
//             tokenId: tokenId,
//             seller: msg.sender,
//             buyer: address(0),
//             price: price
//         });

//         _addActiveOrder(msg.sender, tokenId);

//         orderCount++;
//         activeOrderCount++;
//     }

//     /**
//      * @notice Updates the price of a listed orders
//      */
//     function updateOrder(uint256 tokenId, uint256 price) external {

//     }

//     /**
//      * @notice Cancels a currently listed order, returning the BREWERY to the owner
//      */
//     function cancelOrder(uint256 tokenId) external {
//         Order storage order = orders[activeOrdersIndex[tokenId]];
//         require(order.seller == msg.sender, "Only the seller can cancel order");
        
//         // Transfer the brewery into the escrow contract
//         brewery.safeTransferFrom(address(this), msg.sender, tokenId);

//         // Remove the active order
//         _removeActiveOrder(tokenId);
        
//         // Mark order
//         order.active = false;
//     }

//     /**
//      * @notice Purchases an active order
//      * @dev    `amount` is needed to ensure buyer isnt frontrun
//      */
//     function buyOrder(uint256 tokenId, uint256 amount) external {
//         Order storage order = orders[activeOrdersIndex[tokenId]];
//         require(order.active, "Order is no longer available!");
//         require(order.price == amount, "Amount isn't equal to price!");

//         // Handle the transfer of payment
//         // - Transfer 75% to the seller
//         // - Of the 25%:
//         //   - 70% goes to rewards pool
//         //   - 30% goes to the treasury
//         uint256 taxAmount = order.price * settings.marketplaceFee() / 1e4;
//         uint256 sellerAmount = order.price - taxAmount;
//         uint256 treasuryAmount = taxAmount * settings.treasuryFee() / 1e4;
//         mead.safeTransferFrom(msg.sender, settings.tavernsKeep(), treasuryAmount);
//         mead.safeTransferFrom(msg.sender, settings.rewardsPool(), taxAmount - treasuryAmount);
//         mead.safeTransferFrom(msg.sender, order.seller, sellerAmount);

//         // Transfer the brewery to the buyer
//         brewery.safeTransferFrom(address(this), msg.sender, tokenId);

//         // Remove the order from the active list
//         _removeActiveOrder(tokenId);

//         // Mark order
//         order.buyer = msg.sender;
//         order.active = false;
//     }

//     /**
//      * @notice Used to add a tracked order
//      */
//     function _addActiveOrder(address seller, uint256 tokenId) internal {
//         activeOrders[orderCount] = tokenId;
//         activeOrdersIndex[tokenId] = orderCount;

//         ownedOrders[seller][]
//         ownedOrdersIndex
//     }

//     /**
//      * @notice Used to track an active order
//      */
//     function _removeActiveOrder(uint256 tokenId) internal {
//         uint256 lastOrderId = activeOrderCount - 1;
//         uint256 orderId = activeOrderIds[tokenId];

//         // Swap the order while we aren't on the last token
//         if(orderId != lastOrderId) {
//             uint256 lastTokenId = activeOrders[lastOrderId];

//             activeOrders[orderId] = lastTokenId;
//             activeOrderIds[lastTokenId] = orderId;
//         }

//         delete activeOrderIds[tokenId];
//         delete activeOrders[lastOrderId];
//     }
// }