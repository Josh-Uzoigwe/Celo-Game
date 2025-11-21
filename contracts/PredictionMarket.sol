// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Decentralized Prediction Market for Celo
/// @notice Enables permissionless market creation, betting, resolution, and payout claims.
contract PredictionMarket is ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidOutcome();
    error InvalidMarket();
    error InvalidTimes();
    error MarketLocked();
    error MarketNotResolved();
    error AlreadyResolved();
    error OnlyCreator();
    error AlreadyClaimed();
    error NothingToClaim();
    error PoolIsEmpty();
    error InvalidAmount();
    error TransferFailed();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event MarketCreated(uint256 indexed marketId, address indexed creator);
    event BetPlaced(
        uint256 indexed marketId,
        uint256 indexed outcomeId,
        address indexed bettor,
        uint256 amount
    );
    event MarketResolved(
        uint256 indexed marketId,
        uint256 indexed outcomeId,
        uint256 totalPool
    );
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed claimant,
        uint256 amount
    );

    /*//////////////////////////////////////////////////////////////
                                 STORAGE
    //////////////////////////////////////////////////////////////*/

    struct Market {
        address creator;
        string title;
        string description;
        string category;
        string imageUrl;
        string[] outcomes;
        uint256[] outcomePools;
        uint256 totalPool;
        uint256 lockTime;
        uint256 resolveTime;
        bool resolved;
        uint256 winningOutcome;
    }

    Market[] private markets;

    // marketId => user => outcomeId => stake
    mapping(uint256 => mapping(address => mapping(uint256 => uint256)))
        public userStakes;

    // marketId => user => claimed?
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    /*//////////////////////////////////////////////////////////////
                                 MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier marketExists(uint256 marketId) {
        if (marketId >= markets.length) revert InvalidMarket();
        _;
    }

    modifier onlyCreator(uint256 marketId) {
        if (msg.sender != markets[marketId].creator) revert OnlyCreator();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                             MARKET ACTIONS
    //////////////////////////////////////////////////////////////*/

    function createMarket(
        string calldata title,
        string calldata description,
        string calldata category,
        string calldata imageUrl,
        string[] calldata outcomes,
        uint256 lockTime,
        uint256 resolveTime
    ) external returns (uint256 marketId) {
        if (outcomes.length < 2) revert InvalidOutcome();
        if (lockTime <= block.timestamp || resolveTime <= lockTime)
            revert InvalidTimes();

        uint256[] memory outcomePools = new uint256[](outcomes.length);

        Market memory newMarket = Market({
            creator: msg.sender,
            title: title,
            description: description,
            category: category,
            imageUrl: imageUrl,
            outcomes: outcomes,
            outcomePools: outcomePools,
            totalPool: 0,
            lockTime: lockTime,
            resolveTime: resolveTime,
            resolved: false,
            winningOutcome: type(uint256).max
        });

        markets.push(newMarket);
        marketId = markets.length - 1;

        emit MarketCreated(marketId, msg.sender);
    }

    function bet(
        uint256 marketId,
        uint256 outcomeId
    ) external payable marketExists(marketId) {
        Market storage market = markets[marketId];

        if (block.timestamp >= market.lockTime) revert MarketLocked();
        if (outcomeId >= market.outcomes.length) revert InvalidOutcome();
        if (msg.value == 0) revert InvalidAmount();

        market.outcomePools[outcomeId] += msg.value;
        market.totalPool += msg.value;
        userStakes[marketId][msg.sender][outcomeId] += msg.value;

        emit BetPlaced(marketId, outcomeId, msg.sender, msg.value);
    }

    function resolveMarket(
        uint256 marketId,
        uint256 outcomeId
    ) external marketExists(marketId) onlyCreator(marketId) {
        Market storage market = markets[marketId];

        if (market.resolved) revert AlreadyResolved();
        if (block.timestamp < market.resolveTime) revert MarketLocked();
        if (outcomeId >= market.outcomes.length) revert InvalidOutcome();

        market.resolved = true;
        market.winningOutcome = outcomeId;

        emit MarketResolved(marketId, outcomeId, market.totalPool);
    }

    function claim(uint256 marketId) external nonReentrant marketExists(marketId) {
        Market storage market = markets[marketId];

        if (!market.resolved) revert MarketNotResolved();
        if (hasClaimed[marketId][msg.sender]) revert AlreadyClaimed();

        uint256 userStake = userStakes[marketId][msg.sender][
            market.winningOutcome
        ];
        if (userStake == 0) revert NothingToClaim();

        uint256 winningPool = market.outcomePools[market.winningOutcome];
        if (winningPool == 0) revert PoolIsEmpty();

        uint256 payout = (userStake * market.totalPool) / winningPool;

        hasClaimed[marketId][msg.sender] = true;
        userStakes[marketId][msg.sender][market.winningOutcome] = 0;

        (bool success, ) = msg.sender.call{value: payout}("");
        if (!success) revert TransferFailed();

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    /*//////////////////////////////////////////////////////////////
                                 VIEWS
    //////////////////////////////////////////////////////////////*/

    function getMarket(
        uint256 marketId
    ) external view marketExists(marketId) returns (Market memory) {
        return markets[marketId];
    }

    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }
}

/// @dev Lightweight reentrancy guard for CELO native transfers.
abstract contract ReentrancyGuard {
    error ReentrancyDetected();

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyDetected();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

