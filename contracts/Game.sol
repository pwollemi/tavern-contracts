// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

/** 
 * @title Tavern Games
 * @author Daniel Lee
 * @notice This contract is for dice game of tavern
 * @dev All function calls are currently implemented without side effects
 */
contract Game is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    enum GameStatus { Created, Rolled }
    enum BetOption { EVEN, ODD, ACES }

    struct GameInfo {
        // Current status of game
        GameStatus status;
        // Roll time of each game
        uint256 rollAfter;
        // Roll time of each game. (gameId => result)
        uint256[6] results;
    }
    
    struct BetInfo {
        // Bet option
        BetOption option;
        // Bet amount
        uint256 amount;
        // Claimed
        bool claimed;
    }

    // MEAD token
    address public mead;

    // total games count; gameId increases from 1
    uint256 public totalGames;

    // Game infos
    mapping(uint256 => GameInfo) public games;

    // Betting status of each user. (gameId => user => Bet)
    mapping(uint256 => mapping(address => BetInfo)) public bets;


    // emitted when dice is rolled
    event GameCreated(uint256 gameId, uint256 rollAfter);

    // emitted when user bets
    event Bet(uint256 gameId, address indexed user, BetOption option, uint256 amount);

    // emitted when dice is rolled
    event Rolled(uint256 gameId, uint256[6] results);

    // emitted when user claims winning rewards
    event ClaimReward(uint256 gameId, address indexed user, uint256 reward);

    /**
     * @notice Checks if address is a contract
     * @dev It prevents contract from being targetted
     */
    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    /**
     * @notice Checks if the msg.sender is a contract or a proxy
     */
    modifier notContract() {
        require(!_isContract(msg.sender), "contract not allowed");
        require(msg.sender == tx.origin, "proxy contract not allowed");
        _;
    }

    /**
     * @dev Initializes the contract by setting `flares`, `hiros` and randomness parms to the token collection.
     */
    function initialize(address _mead) external initializer {
        __Ownable_init();

        mead = _mead;
    }

    /**
     * @dev Create new game
     */
    function setMeadToken(address _mead) external onlyOwner {
        mead = _mead;
    }

    /**
     * @dev Create new game
     */
    function createGame(uint256 _rollAfter) public {
        totalGames = totalGames + 1;
        games[totalGames].status = GameStatus.Created;
        games[totalGames].rollAfter = _rollAfter;

        emit GameCreated(totalGames, _rollAfter);
    }

    /**
     * @dev Create new bets
     */
    function betOnGame(uint256 gameId, BetOption option, uint256 amount) public {
        require(gameId <= totalGames, "Game doesn't exist");
        require(games[gameId].status == GameStatus.Created, "Dice is already rolled");
        require(amount > 0, "Invalid zero amount");
        require(bets[gameId][msg.sender].amount == 0, "Already bet");

        IERC20Upgradeable(mead).safeTransferFrom(msg.sender, address(this), amount);

        bets[gameId][msg.sender].amount = amount;
        bets[gameId][msg.sender].option = option;

        emit Bet(gameId, msg.sender, option, amount);
    }

    /**
     * @dev roll the dice
     */
    function roll(uint256 gameId) public notContract {
        GameInfo storage game = games[gameId];

        require(game.rollAfter >= block.timestamp, "Not roll time");
        require(game.status == GameStatus.Created, "Already rolled");

        uint256 randomness = uint256(keccak256(abi.encodePacked(block.difficulty, block.timestamp, blockhash(block.number - 1), gameId))) % 6 + 1; 

        game.results[0] = randomness % 6 + 1;
        randomness = randomness / 6;
        game.results[1] = randomness % 6 + 1;
        randomness = randomness / 6;
        game.results[2] = randomness % 6 + 1;
        randomness = randomness / 6;
        game.results[3] = randomness % 6 + 1;
        randomness = randomness / 6;
        game.results[4] = randomness % 6 + 1;
        randomness = randomness / 6;
        game.results[5] = randomness % 6 + 1;
        game.status = GameStatus.Rolled;

        emit Rolled(gameId, game.results);
    }

    /**
     * @dev return win amount of the user at game
     */
    function getWinAmount(uint256 gameId, address user) public view returns (uint256) {
        GameInfo memory game = games[gameId];
        BetInfo memory bet = bets[gameId][user];

        require(bet.amount > 0, "No bet");
        require(game.status == GameStatus.Rolled, "Not rolled yet");

        if (bet.option == BetOption.EVEN) {
            for (uint256 i = 0; i < 6; i += 1) {
                if (game.results[i] % 2 == 1) {
                    return 0;
                }
            }
            return bet.amount * 2;
        } 
        if (bet.option == BetOption.ODD) {
            for (uint256 i = 0; i < 6; i += 1) {
                if (game.results[i] % 2 == 0) {
                    return 0;
                }
            }
            return bet.amount * 2;
        } 
        if (bet.option == BetOption.ACES) {
            for (uint256 i = 0; i < 6; i += 1) {
                if (game.results[i] != 1 && game.results[i] != 2) {
                    return 0;
                }
            }
            return bet.amount * 7;
        }
        return 0;
    }

    /**
     * @dev Claims winning rewards
     */
    function claimWinAmount(uint256 gameId) external notContract {
        uint256 amount = getWinAmount(gameId, msg.sender);
        bets[gameId][msg.sender].claimed = true;
        IERC20Upgradeable(mead).safeTransfer(msg.sender, amount);

        emit ClaimReward(gameId, msg.sender, amount);
    }
}
