// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./chainlink/VRFConsumerBaseUpgradeable.sol";

/** 
 * @title Tavern Games
 * @author Daniel Lee
 * @notice This contract is for dice game of tavern
 * @dev All function calls are currently implemented without side effects
 */
contract GameVRF is Initializable, OwnableUpgradeable, VRFConsumerBaseUpgradeable {
    enum GameStatus { Created, WaitingForVRF, Rolled }

    // Randomness

    // Chainlink VRF fee which varies by network
    uint256 internal randomFee;

    // Chainlink VRF Key Hash which varies by network
    bytes32 internal keyHash;

    // Chainlink VRF requestId => game id
    mapping(bytes32 => uint256) internal vrfRequests;


    // Game Info

    // total games count; gameId increases from 1
    uint256 public totalGames;

    // Current status of each game. (gameId => status)
    mapping(uint256 => GameStatus) public gameStatuses;

    // Roll time of each game. (gameId => timestamp)
    mapping(uint256 => uint256) public rollAfter;

    // Roll time of each game. (gameId => result)
    mapping(uint256 => uint256) public results;

    // Betting status of each game. (gameId => number => user array)
    mapping(uint256 => mapping(uint256 => address[])) public betsOnGame;

    // Betting status of each user. (gameId => user => value)
    mapping(uint256 => mapping(address => uint256)) public betsOfUsers;


    // emitted when dice is rolled
    event GameCreated(uint256 gameId);

    // emitted when user bets
    event Bet(uint256 gameId, address indexed user, uint256 number);

    // emitted when dice is cast
    event Cast(uint256 gameId);

    // emitted when dice is rolled
    event Rolled(uint256 gameId, uint256 result);

    /**
     * @dev Initializes the contract by setting `flares`, `hiros` and randomness parms to the token collection.
     */
    function initialize(
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        uint256 _randomFee
    ) external initializer {
        __Ownable_init();
        __VRFConsumerBase_init(_vrfCoordinator, _link);

        randomFee = _randomFee;
        keyHash = _keyHash;
    }

    /**
     * @dev Withdraw LINK tokens`
     */
    function withdrawLINK(address to, uint256 amount) public onlyOwner {
        LINK.transfer(to, amount);
    }

    /**
     * @dev Create new game
     */
    function createGame(uint256 _rollAfter) public {
        totalGames = totalGames + 1;
        gameStatuses[totalGames] = GameStatus.Created;
        rollAfter[totalGames] = _rollAfter;

        emit GameCreated(totalGames);
    }

    /**
     * @dev Create new game
     */
    function betOnGame(uint256 gameId, uint256 value) public {
        require(value >= 1 && value <= 6, "Must be valid dice value");
        require(gameId <= totalGames, "Game doesn't exist");
        require(gameStatuses[gameId] == GameStatus.Created, "Dice is already rolled");
        betsOnGame[gameId][value].push(msg.sender);
        betsOfUsers[gameId][msg.sender] = value;

        emit Bet(gameId, msg.sender, value);
    }

    /**
     * @dev roll the dice
     *
     * We assume chainlink VRF always correctly works
     *
     */
    function roll(uint256 gameId) public {
        require(rollAfter[gameId] >= block.timestamp, "Not roll time");

        require(gameStatuses[gameId] == GameStatus.Created, "Already rolled");

        // request random value to try ignition
        require(LINK.balanceOf(address(this)) >= randomFee, "Not enough LINK - fill contract with faucet");
        bytes32 requestId = requestRandomness(keyHash, randomFee);
        vrfRequests[requestId] = gameId;

        gameStatuses[gameId] = GameStatus.WaitingForVRF;

        emit Cast(gameId);
    }

    /**
     * @dev Callback function used by VRF Coordinator
     *
     * We process random roll here
     *
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        uint256 gameId = vrfRequests[requestId];
        uint256 result = randomness % 6 + 1; 
        results[gameId] = result;
        gameStatuses[gameId] = GameStatus.Rolled;

        emit Rolled(gameId, result);
    }

}
