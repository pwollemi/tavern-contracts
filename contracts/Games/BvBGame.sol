pragma solidity ^0.8.4;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

contract BvBGame is Initializable, ERC721EnumerableUpgradeable {
    struct Lobby {
        // joined user
        address joiner;
        // marked if lobby is canceled
        bool isCanceled;
        // game start time
        uint256 startTime;
        // amount in mead
        uint256 betAmount;
    }

    /// @notice lobbies data
    mapping(uint256 => Lobby) public lobbies;

    /// @notice mead token
    IERC20Upgradeable public mead;

    event LobbyCreated(uint256 lobbyId, address indexed creator, uint256 startTime, uint256 amount);
    event LobbyUpdated(uint256 lobbyId, uint256 startTime);
    event LobbyCanceled(uint256 lobbyId);
    event LobbyJoined(uint256 lobbyId, address indexed joiner);
    event LobbyUnjoined(uint256 lobbyId);

    modifier notStarted(uint256 lobbyId) {
        require(lobbies[lobbyId].startTime > block.timestamp, "Lobby is alredy started");
        _;
    }

    modifier notCanceled(uint256 lobbyId) {
        require(lobbies[lobbyId].isCanceled == false, "Lobby is canceled");
        _;
    }

    modifier notJoined(uint256 lobbyId) {
        require(lobbies[lobbyId].joiner == address(0), "Already joined");
        _;
    }
    
    modifier onlyLobbyOwner(uint256 lobbyId) {
        require(ownerOf(lobbyId) == _msgSender(), "Must be lobby owner");
        _;        
    }

    modifier isInProgress(uint256 lobbyId) {
       require(lobbies[lobbyId].startTime <= block.timestamp && lobbies[lobbyId].startTime + 5 minutes > block.timestamp, "Lobby is not in progress");
        _;
    }

    function initialize(IERC20Upgradeable _mead) external initializer {
        __ERC721Enumerable_init();
        __ERC721_init("BvBGame Lobby", "BvB");

        mead = _mead;
    }

    /**
     * @notice Created a new lobby
     * @dev Emits creation event
     */
    function createLobby(uint256 startTime, uint256 betAmount) external {
        require(startTime > block.timestamp, "startTime must be in the future");
        uint256 newId = totalSupply() + 1;
        _mint(_msgSender(), newId);
        lobbies[newId] = Lobby(address(0), false, startTime, betAmount);

        mead.transferFrom(_msgSender(), address(this), betAmount);
        
        emit LobbyCreated(newId, _msgSender(), startTime, betAmount);
    }

    /**
     * @notice Update game start time
     * @dev Emits update event
     */
    function updateStartTime(uint256 lobbyId, uint256 _startTime) external notCanceled(lobbyId) notStarted(lobbyId) onlyLobbyOwner(lobbyId) {
        lobbies[lobbyId].startTime = _startTime;

        emit LobbyUpdated(lobbyId, _startTime);
    }

    /**
     * @notice Cancel game
     * @dev If there's a person joined, return his mead token as well
     */
    function cancelLobby(uint256 lobbyId) external notCanceled(lobbyId) notStarted(lobbyId) onlyLobbyOwner(lobbyId) {
        Lobby storage lobby = lobbies[lobbyId];
        lobby.isCanceled = true;
        mead.transfer(_msgSender(), lobby.betAmount);

        if (lobby.joiner != address(0)) {
            mead.transfer(lobby.joiner, lobby.betAmount);
        }

        emit LobbyCanceled(lobbyId);
    }

    /**
     * @notice Join game
     * @dev Emits join event
     */
    function joinLobby(uint256 lobbyId) external notCanceled(lobbyId) notStarted(lobbyId) notJoined(lobbyId) {
        Lobby storage lobby = lobbies[lobbyId];
        lobby.joiner = _msgSender();
        mead.transferFrom(_msgSender(), address(this), lobby.betAmount);

        emit LobbyJoined(lobbyId, _msgSender());
    }

    /**
     * @notice Unjoin game
     * @dev Emits unjoin event
     */
    function unjoinLobby(uint256 lobbyId) external notCanceled(lobbyId) notStarted(lobbyId) {
        Lobby storage lobby = lobbies[lobbyId];
        require(lobby.joiner == _msgSender(), "You're not joiner");
        require(lobby.startTime > block.timestamp + 60, "Can't unjoin in less than 1 min");
        lobby.joiner = address(0);
        mead.transfer(_msgSender(), lobby.betAmount);

        emit LobbyUnjoined(lobbyId);
    }
}
