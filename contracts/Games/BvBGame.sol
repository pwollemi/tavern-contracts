pragma solidity ^0.8.4;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "../chainlink/VRFConsumerBaseV2Upgradeable.sol";
import "../chainlink/interfaces/IVRFCoordinatorV2.sol";

contract BvBGame is
    Initializable,
    OwnableUpgradeable,
    ERC721EnumerableUpgradeable,
    VRFConsumerBaseV2Upgradeable
{
    struct BreweryStatus {
        // Mead amount in Brewery; it's not total mead, should add pending mead for total mead
        uint256 mead;
        // Points gained by Brewery
        uint256 points;
        // Valve close/open status
        bool isValveOpened;
        // Last valve updated timestamp
        uint256 lastUpdatedAt;
        // Production rate of Mead
        uint256 meadPerSecond;
        // Flow rate of mead
        uint256 flowRatePerSecond;
        // Normal flow rate
        uint256 normalFlowRate;
        // Points Per second
        uint256 pointsPerSecond;
    }

    struct Lobby {
        // joined user
        address joiner;
        // marked if lobby is canceled
        bool isCanceled;
        // game start time
        uint256 startTime;
        // game end time
        uint256 endTime;
        // amount in mead
        uint256 betAmount;
        // winner claimed; or each claimed in a draw
        bool isClaimed;
    }

    struct Catapult {
        // chance to destroy pipes in bips
        uint256 chance;
        // points needed for this catapult
        uint256 pointsNeeded;
    }

    struct CatapultRandomInfo {
        // owner of brewery
        address user;
        // lobby id
        uint256 lobbyId;
        // type of catapult
        uint256 catapultIndex;
    }

    struct GameStatus {
        uint256 lobbyId;
        address player;
        uint256 points;
        uint256 flows;
        uint256 repairPoints;
        bool valveOpen;
        bool pipeBroken;
    }

    /// @notice duration of the game: 5 mins
    uint256 public constant GAME_DURATION = 5 minutes;

    /// Standard params

    /// @notice Normal Flow rate
    uint256 public normalFlowRate;

    /// @notice Normal Flow rate
    uint256 public normalMeadPerSecond;

    /// @notice Normal Flow rate
    uint256 public normalPointsPerSecond;

    /// Status

    /// @notice lobbies data
    mapping(uint256 => Lobby) public lobbies;

    /// @notice breweries
    mapping(uint256 => mapping(address => BreweryStatus)) public breweries;

    /// @notice mead token
    IERC20Upgradeable public mead;

    /// @notice fee percentage in bips
    uint256 public feePercentage;

    /// @notice fee receiver
    address public feeTo;

    /// @notice catapults info
    Catapult[] public catapults;

    // Points for repair once
    uint256 public repairPointPerFlowRate;

    // VRF info

    // Chainlink VRF Key Hash which varies by network
    bytes32 internal keyHash;

    // VRF Coordinator
    address internal vrfCoordinator;

    // Subscription ID
    uint64 public vrfSubId;

    // Chainlink VRF requestId => catapult random info
    mapping(uint256 => CatapultRandomInfo) internal vrfRequests;

    event LobbyCreated(
        uint256 lobbyId,
        address indexed creator,
        uint256 startTime,
        uint256 amount
    );
    event LobbyUpdated(uint256 lobbyId, uint256 startTime);
    event LobbyCanceled(uint256 lobbyId);
    event LobbyJoined(uint256 lobbyId, address indexed joiner);
    event LobbyUnjoined(uint256 lobbyId);
    event LobbyEnded(
        uint256 lobbyId,
        address indexed winner,
        uint256 timestamp
    );
    event CatapultInited(
        uint256 lobbyId,
        address indexed user,
        uint256 catapultIndex
    );
    event CatapultResult(
        uint256 lobbyId,
        address indexed user,
        uint256 catapultIndex,
        bool isOnTarget
    );
    event RepairPipe(
        uint256 lobbyId,
        address indexed user,
        uint256 flowRateAfter,
        uint256 pointsAfter
    );

    modifier notStarted(uint256 lobbyId) {
        require(
            lobbies[lobbyId].startTime > block.timestamp,
            "Lobby is alredy started"
        );
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
        require(lobbies[lobbyId].joiner != address(0), "Nobody joined");
        require(lobbies[lobbyId].isCanceled == false, "Lobby is canceled");
        require(
            lobbies[lobbyId].startTime <= block.timestamp &&
                lobbies[lobbyId].endTime > block.timestamp,
            "Lobby is not in progress"
        );
        _;
    }

    modifier isValidCatapult(uint256 catapultIndex) {
        require(catapultIndex < catapults.length, "Invalid catapult index");
        _;
    }

    function initialize(
        IERC20Upgradeable _mead,
        address _feeTo,
        uint256 _feePercentage,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subId
    ) external initializer {
        __ERC721Enumerable_init();
        __Ownable_init();
        __ERC721_init("BvBGame Lobby", "BvB");
        __VRFConsumerBaseV2_init(_vrfCoordinator);

        keyHash = _keyHash;
        vrfCoordinator = _vrfCoordinator;
        vrfSubId = _subId;

        mead = _mead;
        feeTo = _feeTo;
        feePercentage = _feePercentage;

        catapults.push(Catapult(3000, 100));
        catapults.push(Catapult(6000, 250));
        catapults.push(Catapult(9000, 500));

        normalFlowRate = 10;
        normalMeadPerSecond = 10;
        normalPointsPerSecond = 10;
        repairPointPerFlowRate = 100;
    }

    //////////////////////////////////////////////////////////////////////
    //                                                                  //
    //                          Admin Functions                         //
    //                                                                  //
    //////////////////////////////////////////////////////////////////////

    /**
     * @notice Set fee info
     */
    function setFeeInfo(address _feeTo, uint256 _feePercentage)
        external
        onlyOwner
    {
        feeTo = _feeTo;
        feePercentage = _feePercentage;
    }

    /**
     * @notice Set subscription id
     */
    function setVRFSubId(uint64 _subId) external onlyOwner {
        vrfSubId = _subId;
    }

    /**
     * @notice Set repairPointPerFlowRate
     */
    function setRepairPointPerFlowRate(uint256 _repairPointPerFlowRate)
        external
        onlyOwner
    {
        repairPointPerFlowRate = _repairPointPerFlowRate;
    }

    function clearCatapults() external onlyOwner {
        delete catapults;
    }

    function addCatapults() external onlyOwner {
        catapults.push(Catapult(3000, 100));
        catapults.push(Catapult(6000, 250));
        catapults.push(Catapult(9000, 500));
    }

    //////////////////////////////////////////////////////////////////////
    //                                                                  //
    //                          Lobby Management                        //
    //                                                                  //
    //////////////////////////////////////////////////////////////////////

    /**
     * @notice Created a new lobby
     * @dev Emits creation event
     */
    function createLobby(uint256 startTime, uint256 betAmount) external {
        require(startTime > block.timestamp, "startTime must be in the future");
        uint256 newId = totalSupply() + 1;
        _mint(_msgSender(), newId);
        lobbies[newId] = Lobby(
            address(0),
            false,
            startTime,
            startTime + GAME_DURATION,
            betAmount,
            false
        );

        mead.transferFrom(_msgSender(), address(this), betAmount);

        breweries[newId][_msgSender()].normalFlowRate = normalFlowRate;
        breweries[newId][_msgSender()].flowRatePerSecond = normalFlowRate;
        breweries[newId][_msgSender()].meadPerSecond = normalMeadPerSecond;
        breweries[newId][_msgSender()].pointsPerSecond = normalPointsPerSecond;
        breweries[newId][_msgSender()].lastUpdatedAt = startTime;

        emit LobbyCreated(newId, _msgSender(), startTime, betAmount);
    }

    /**
     * @notice Update game start time
     * @dev Emits update event
     */
    function updateStartTime(uint256 lobbyId, uint256 _startTime)
        external
        notCanceled(lobbyId)
        notStarted(lobbyId)
        onlyLobbyOwner(lobbyId)
    {
        lobbies[lobbyId].startTime = _startTime;
        lobbies[lobbyId].endTime = _startTime + GAME_DURATION;

        emit LobbyUpdated(lobbyId, _startTime);
    }

    /**
     * @notice Cancel game
     * @dev If there's a person joined, return his mead token as well
     */
    function cancelLobby(uint256 lobbyId)
        external
        notCanceled(lobbyId)
        onlyLobbyOwner(lobbyId)
    {
        Lobby storage lobby = lobbies[lobbyId];
        require(
            lobby.startTime > block.timestamp || lobby.joiner == address(0),
            "Lobby is alredy started"
        );

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
    function joinLobby(uint256 lobbyId)
        external
        notCanceled(lobbyId)
        notStarted(lobbyId)
        notJoined(lobbyId)
    {
        Lobby storage lobby = lobbies[lobbyId];
        require(
            ownerOf(lobbyId) != _msgSender(),
            "You can't join your own game"
        );
        lobby.joiner = _msgSender();
        mead.transferFrom(_msgSender(), address(this), lobby.betAmount);

        breweries[lobbyId][_msgSender()].normalFlowRate = normalFlowRate;
        breweries[lobbyId][_msgSender()].flowRatePerSecond = normalFlowRate;
        breweries[lobbyId][_msgSender()].meadPerSecond = normalMeadPerSecond;
        breweries[lobbyId][_msgSender()]
            .pointsPerSecond = normalPointsPerSecond;
        breweries[lobbyId][_msgSender()].lastUpdatedAt = lobby.startTime;

        emit LobbyJoined(lobbyId, _msgSender());
    }

    /**
     * @notice Unjoin game
     * @dev Emits unjoin event
     */
    function unjoinLobby(uint256 lobbyId)
        external
        notCanceled(lobbyId)
        notStarted(lobbyId)
    {
        Lobby storage lobby = lobbies[lobbyId];
        require(lobby.joiner == _msgSender(), "You're not joiner");
        require(
            lobby.startTime > block.timestamp + 60,
            "Can't unjoin in less than 1 min"
        );
        lobby.joiner = address(0);
        mead.transfer(_msgSender(), lobby.betAmount);

        emit LobbyUnjoined(lobbyId);
    }

    /**
     * @notice Open/close mead lever
     * @dev it's only flowed mead since lastUpdatedAt
     */
    function toggleLever(uint256 lobbyId, bool isValveOpened)
        public
        isInProgress(lobbyId)
    {
        _updateLobby(lobbyId);

        Lobby memory lobby = lobbies[lobbyId];
        require(
            ownerOf(lobbyId) == _msgSender() || lobby.joiner == _msgSender(),
            "Not part of the game"
        );
        BreweryStatus storage brewery = breweries[lobbyId][_msgSender()];
        require(brewery.isValveOpened != isValveOpened, "Same status update");
        brewery.isValveOpened = isValveOpened;
    }

    //////////////////////////////////////////////////////////////////////
    //                                                                  //
    //                          Game Logic                              //
    //                                                                  //
    //////////////////////////////////////////////////////////////////////

    /**
     * @notice Mead amount produced in Brewery
     * @dev it's only produced amount
     */
    function pendingMead(uint256 lobbyId, address owner)
        public
        view
        returns (uint256)
    {
        BreweryStatus memory brewery = breweries[lobbyId][owner];
        if (brewery.isValveOpened) {
            uint256 lastGameTime = lobbies[lobbyId].endTime > block.timestamp
                ? block.timestamp
                : lobbies[lobbyId].endTime;
            if (brewery.lastUpdatedAt > lastGameTime) {
                return 0;
            }
            return
                (lastGameTime - brewery.lastUpdatedAt) *
                brewery.flowRatePerSecond;
        }
        return 0;
    }

    /**
     * @notice Mead amount inside Brewery produced so far
     * @dev totalMead = stored Mead + pending Mead
     */
    function totalMead(uint256 lobbyId, address owner)
        public
        view
        returns (uint256)
    {
        BreweryStatus memory brewery = breweries[lobbyId][owner];
        return brewery.mead + pendingMead(lobbyId, owner);
    }

    /**
     * @notice Mead amount produced in Brewery
     * @dev it's only produced amount
     */
    function pendingPoints(uint256 lobbyId, address owner)
        public
        view
        returns (uint256)
    {
        BreweryStatus memory brewery = breweries[lobbyId][owner];
        if (!brewery.isValveOpened) {
            uint256 lastGameTime = lobbies[lobbyId].endTime > block.timestamp
                ? block.timestamp
                : lobbies[lobbyId].endTime;
            if (brewery.lastUpdatedAt > lastGameTime) {
                return 0;
            }
            return
                (lastGameTime - brewery.lastUpdatedAt) *
                brewery.pointsPerSecond;
        }
        return 0;
    }

    /**
     * @notice Total points inside Brewery
     */
    function totalPoints(uint256 lobbyId, address owner)
        public
        view
        returns (uint256)
    {
        BreweryStatus memory brewery = breweries[lobbyId][owner];
        return brewery.points + pendingPoints(lobbyId, owner);
    }

    /**
     * @notice Update mead amount produced in Brewery
     * @dev Convert pending mead into stored mead amount
     */
    function _updateBrewery(uint256 lobbyId, address owner) internal {
        BreweryStatus storage brewery = breweries[lobbyId][owner];
        brewery.points = totalPoints(lobbyId, owner);
        brewery.mead = totalMead(lobbyId, owner);
        brewery.lastUpdatedAt = block.timestamp;
    }

    /**
     * @notice Update mead amount produced in Brewery
     * @dev Convert pending mead into stored mead amount
     */
    function _updateLobby(uint256 lobbyId) internal {
        Lobby memory lobby = lobbies[lobbyId];
        _updateBrewery(lobbyId, ownerOf(lobbyId));
        _updateBrewery(lobbyId, lobby.joiner);
    }

    //////////////////////////////////////////////////////////////////////
    //                                                                  //
    //                      Catapult/Pipe Logic                         //
    //                                                                  //
    //////////////////////////////////////////////////////////////////////

    /**
     * @notice Buy catapults
     * @dev Use catapults using points
     */
    function useCatapult(uint256 lobbyId, uint256 catapultIndex)
        external
        isInProgress(lobbyId)
        isValidCatapult(catapultIndex)
    {
        _updateLobby(lobbyId);

        Lobby memory lobby = lobbies[lobbyId];
        require(
            ownerOf(lobbyId) == _msgSender() || lobby.joiner == _msgSender(),
            "Not part of the game"
        );

        address opponent = ownerOf(lobbyId);
        if (_msgSender() == ownerOf(lobbyId)) {
            opponent = lobby.joiner;
        }
        require(
            breweries[lobbyId][opponent].flowRatePerSecond ==
                breweries[lobbyId][opponent].normalFlowRate,
            "Already broken"
        );
        BreweryStatus storage brewery = breweries[lobbyId][_msgSender()];
        brewery.points = brewery.points - catapults[catapultIndex].pointsNeeded;

        uint256 requestId = IVRFCoordinatorV2(vrfCoordinator)
            .requestRandomWords(keyHash, vrfSubId, 1, 2500000, 1);
        vrfRequests[requestId] = CatapultRandomInfo(
            opponent,
            lobbyId,
            catapultIndex
        );

        emit CatapultInited(lobbyId, _msgSender(), catapultIndex);
    }

    /**
     * @dev Callback function used by VRF Coordinator
     *
     * We process random catapult here
     *
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        uint256 randomness = randomWords[0];

        CatapultRandomInfo memory randomInfo = vrfRequests[requestId];
        delete vrfRequests[requestId];

        _updateLobby(randomInfo.lobbyId);

        bool isOnTarget = randomness % 100 <
            catapults[randomInfo.catapultIndex].chance / 100;
        if (isOnTarget) {
            BreweryStatus storage brewery = breweries[randomInfo.lobbyId][
                randomInfo.user
            ];
            brewery.flowRatePerSecond = (brewery.flowRatePerSecond + 1) / 2;
        }

        emit CatapultResult(
            randomInfo.lobbyId,
            randomInfo.user,
            randomInfo.catapultIndex,
            isOnTarget
        );
    }

    /**
     * @dev Repair pipe; is pipe destroyed or not?
     */
    function repairPipe(uint256 lobbyId) external isInProgress(lobbyId) {
        _updateLobby(lobbyId);

        BreweryStatus storage brewery = breweries[lobbyId][_msgSender()];
        require(
            brewery.normalFlowRate > brewery.flowRatePerSecond,
            "Not destoryed"
        );
        uint256 neededPoints = (brewery.normalFlowRate -
            brewery.flowRatePerSecond) * repairPointPerFlowRate;
        require(brewery.points > neededPoints, "Points not enough for repair");
        brewery.points = brewery.points - neededPoints;
        brewery.flowRatePerSecond = brewery.normalFlowRate;

        emit RepairPipe(
            lobbyId,
            _msgSender(),
            brewery.flowRatePerSecond,
            brewery.points
        );
    }

    /**
     * @dev Get all info needed by the frontend to show game status
     */
    function getGameStatus(uint256 lobbyId) public view returns(GameStatus memory owner,GameStatus memory joiner) {
      address player1 =  ownerOf(lobbyId);
      address player2 =  lobbies[lobbyId].joiner;
      owner = getGameStatusByPlayer(lobbyId, player1);
      joiner = getGameStatusByPlayer(lobbyId, player2);
    }

    /**
     * @dev Get game info for one player
     */
    function getGameStatusByPlayer(uint256 lobbyId, address player) public view returns(GameStatus memory){
      BreweryStatus memory brewery = breweries[lobbyId][player];
      return GameStatus(lobbyId, 
      player, 
      brewery.points + pendingPoints(lobbyId, player),
      totalMead(lobbyId, player),
      (brewery.normalFlowRate - brewery.flowRatePerSecond) * repairPointPerFlowRate,
      brewery.isValveOpened,
      brewery.normalFlowRate > brewery.flowRatePerSecond);
    }

    //////////////////////////////////////////////////////////////////////
    //                                                                  //
    //                          Winning Logic                           //
    //                                                                  //
    //////////////////////////////////////////////////////////////////////

    /**
     * @notice Current winner of the game
     * @dev If game is ended, this will return final winner of the lobby; return 0 if both the same
     */
    function winnerOfGame(uint256 lobbyId) public view returns (address, bool) {
        address creator = ownerOf(lobbyId);
        address joiner = lobbies[lobbyId].joiner;
        uint256 creatorLand = totalMead(lobbyId, creator);
        uint256 joinerLand = totalMead(lobbyId, joiner);

        bool canbeFinal = lobbies[lobbyId].endTime < block.timestamp;
        if (!canbeFinal) {
            uint256 creatorLandPercent = (creatorLand * 100) /
                (creatorLand + joinerLand);
            // Can be final if one has 95% of land
            canbeFinal = creatorLandPercent >= 95 || creatorLandPercent <= 5;
        }

        if (creatorLand > joinerLand) {
            return (creator, canbeFinal);
        }
        if (creatorLand < joinerLand) {
            return (joiner, canbeFinal);
        }
        return (address(0), canbeFinal);
    }

    /**
     * @notice Claimed by the winner or by one of them when draw
     * @dev If game is ended, this will return final winner of the lobby; return 0 if both the same
     */
    function claimToWinner(uint256 lobbyId) external {
        (address winner, bool canbeFinal) = winnerOfGame(lobbyId);
        Lobby storage lobby = lobbies[lobbyId];

        _updateLobby(lobbyId);

        require(canbeFinal, "You're not final winner yet");
        require(lobby.isClaimed == false, "Already claimed");
        lobby.isClaimed = true;
        if (lobby.endTime > block.timestamp) {
            lobby.endTime = block.timestamp;
        }

        uint256 totalAmount = lobby.betAmount * 2;
        uint256 feeAmount = (totalAmount * feePercentage) / 1e4;
        uint256 claimAmount = totalAmount - feeAmount;
        if (feeAmount > 0) {
            mead.transfer(feeTo, feeAmount);
        }
        if (winner != address(0)) {
            mead.transfer(winner, claimAmount);
        } else {
            mead.transfer(lobby.joiner, claimAmount / 2);
            mead.transfer(ownerOf(lobbyId), claimAmount / 2);
        }

        emit LobbyEnded(lobbyId, winner, block.timestamp);
    }

}
