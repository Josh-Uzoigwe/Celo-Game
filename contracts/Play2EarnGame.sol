// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Play2EarnGame
/// @notice Round-based skill game treasury + payout manager for SkySprint on Celo.
contract Play2EarnGame is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event RoundCreated(uint256 indexed roundId, uint64 startTime, uint64 endTime);
    event RoundFunded(uint256 indexed roundId, uint256 amount, address indexed sender);
    event PlayerEntered(uint256 indexed roundId, address indexed player);
    event ScoreSubmitted(
        uint256 indexed roundId,
        address indexed player,
        uint256 score,
        bytes32 nonce
    );
    event RoundFinalized(
        uint256 indexed roundId,
        uint256 totalPaid,
        address indexed caller,
        bool jackpotRolled
    );
    event RewardClaimed(address indexed player, uint256 amount);
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    event ScoreRelayerUpdated(address indexed newRelayer);
    event RewardTiersUpdated(uint96[] newTierBps);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidRound();
    error RoundActive();
    error RoundNotActive();
    error RoundNotFinalized();
    error AlreadyEntered();
    error ScoreWindowClosed();
    error InvalidSignature();
    error NonceAlreadyUsed();
    error NothingToClaim();
    error ZeroAddress();
    error InvalidParams();
    error TierBpsMismatch();

    /*//////////////////////////////////////////////////////////////
                                   DATA
    //////////////////////////////////////////////////////////////*/

    uint96 public constant MAX_BPS = 10_000;

    struct Round {
        uint64 startTime;
        uint64 endTime;
        uint256 entryFee;
        uint256 minPlayers;
        uint256 prizePool;
        uint256 playerCount;
        bool finalized;
        bool rolloverEnabled;
    }

    struct ScoreSubmissionState {
        uint256 score;
        bytes32 nonce;
        uint64 submittedAt;
    }

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => bool)) public hasEnteredRound;
    mapping(uint256 => mapping(address => ScoreSubmissionState)) public scores;
    mapping(uint256 => mapping(bytes32 => bool)) public usedNonces;

    // Player => claimable CELO
    mapping(address => uint256) public pendingRewards;

    uint256 public nextRoundId = 1;
    uint256 public jackpotVault;
    uint256 public treasuryAccrual;

    // Default tier distribution (BPS)
    uint96[] public rewardTierBps = [uint96(4000), 2500, 1500, 1000, 1000];

    address public scoreRelayer;
    uint96 public houseRakeBps = 500; // 5%
    uint96 public jackpotContributionBps = 1000; // 10%
    uint64 public scoreGracePeriod = 5 minutes;

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyRelayer() {
        require(msg.sender == scoreRelayer, "NOT_RELAYER");
        _;
    }

    constructor(address _scoreRelayer, address _owner) Ownable(_owner) {
        if (_scoreRelayer == address(0)) revert ZeroAddress();
        scoreRelayer = _scoreRelayer;
    }

    /*//////////////////////////////////////////////////////////////
                              ROUND LOGIC
    //////////////////////////////////////////////////////////////*/

    function createRound(
        uint64 startTime,
        uint64 endTime,
        uint256 entryFee,
        uint256 minPlayers,
        bool rolloverEnabled
    ) external onlyOwner returns (uint256 roundId) {
        if (endTime <= startTime) revert InvalidParams();
        if (entryFee == 0 || minPlayers == 0) revert InvalidParams();

        roundId = nextRoundId++;

        rounds[roundId] = Round({
            startTime: startTime,
            endTime: endTime,
            entryFee: entryFee,
            minPlayers: minPlayers,
            prizePool: 0,
            playerCount: 0,
            finalized: false,
            rolloverEnabled: rolloverEnabled
        });

        emit RoundCreated(roundId, startTime, endTime);
    }

    function fundRound(uint256 roundId) external payable {
        Round storage round = rounds[roundId];
        if (round.endTime == 0) revert InvalidRound();
        round.prizePool += msg.value;
        emit RoundFunded(roundId, msg.value, msg.sender);
    }

    function enterRound(uint256 roundId) external payable nonReentrant {
        Round storage round = rounds[roundId];
        if (round.endTime == 0) revert InvalidRound();
        if (block.timestamp < round.startTime || block.timestamp >= round.endTime) {
            revert RoundNotActive();
        }
        if (hasEnteredRound[roundId][msg.sender]) revert AlreadyEntered();
        if (msg.value != round.entryFee) revert InvalidParams();

        hasEnteredRound[roundId][msg.sender] = true;
        round.playerCount += 1;

        uint256 rake = (msg.value * houseRakeBps) / MAX_BPS;
        uint256 jackpotCut = (msg.value * jackpotContributionBps) / MAX_BPS;
        uint256 netEntry = msg.value - rake - jackpotCut;

        treasuryAccrual += rake;
        jackpotVault += jackpotCut;
        round.prizePool += netEntry;

        emit PlayerEntered(roundId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                               SCORE LOGIC
    //////////////////////////////////////////////////////////////*/

    function submitScore(
        uint256 roundId,
        address player,
        uint256 score,
        bytes32 nonce,
        bytes calldata signature
    ) external onlyRelayer {
        Round memory round = rounds[roundId];
        if (round.endTime == 0) revert InvalidRound();
        if (block.timestamp > round.endTime + scoreGracePeriod) {
            revert ScoreWindowClosed();
        }
        if (!hasEnteredRound[roundId][player]) revert RoundNotActive();
        if (usedNonces[roundId][nonce]) revert NonceAlreadyUsed();
        if (score == 0) revert InvalidParams();

        bytes32 digest = keccak256(
            abi.encodePacked(address(this), roundId, player, score, nonce)
        ).toEthSignedMessageHash();
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != player) revert InvalidSignature();

        usedNonces[roundId][nonce] = true;

        ScoreSubmissionState storage submission = scores[roundId][player];
        if (score > submission.score) {
            submission.score = score;
            submission.nonce = nonce;
            submission.submittedAt = uint64(block.timestamp);
        }

        emit ScoreSubmitted(roundId, player, score, nonce);
    }

    /*//////////////////////////////////////////////////////////////
                              FINALIZATION
    //////////////////////////////////////////////////////////////*/

    function finalizeRound(
        uint256 roundId,
        address[] calldata placements,
        uint96[] calldata customTierBps,
        bool rollOverSurplus
    ) external onlyOwner {
        Round storage round = rounds[roundId];
        if (round.endTime == 0) revert InvalidRound();
        if (block.timestamp <= round.endTime + scoreGracePeriod) revert RoundActive();
        if (round.finalized) revert InvalidParams();
        if (round.playerCount < round.minPlayers) {
            // Optional rollover if not enough players
            if (round.rolloverEnabled || rollOverSurplus) {
                jackpotVault += round.prizePool;
            } else {
                treasuryAccrual += round.prizePool;
            }
            round.finalized = true;
            emit RoundFinalized(roundId, 0, msg.sender, true);
            return;
        }

        uint96[] memory tiers = customTierBps.length > 0 ? customTierBps : rewardTierBps;
        if (placements.length == 0 || placements.length > tiers.length) {
            revert TierBpsMismatch();
        }

        uint256 totalBps;
        for (uint256 i = 0; i < placements.length; i++) {
            totalBps += tiers[i];
        }
        if (totalBps > MAX_BPS) revert InvalidParams();

        uint256 totalPaid;
        for (uint256 i = 0; i < placements.length; i++) {
            address player = placements[i];
            ScoreSubmissionState memory submission = scores[roundId][player];
            if (submission.score == 0) revert InvalidParams();
            uint256 payout = (round.prizePool * tiers[i]) / MAX_BPS;
            pendingRewards[player] += payout;
            totalPaid += payout;
        }

        uint256 surplus = round.prizePool - totalPaid;
        if (surplus > 0) {
            if (rollOverSurplus) {
                jackpotVault += surplus;
            } else {
                treasuryAccrual += surplus;
            }
        }

        round.finalized = true;
        emit RoundFinalized(roundId, totalPaid, msg.sender, rollOverSurplus);
    }

    function claimRewards() external nonReentrant {
        uint256 amount = pendingRewards[msg.sender];
        if (amount == 0) revert NothingToClaim();
        pendingRewards[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "CELO_TRANSFER_FAIL");
        emit RewardClaimed(msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                               ADMIN ACTIONS
    //////////////////////////////////////////////////////////////*/

    function setScoreRelayer(address newRelayer) external onlyOwner {
        if (newRelayer == address(0)) revert ZeroAddress();
        scoreRelayer = newRelayer;
        emit ScoreRelayerUpdated(newRelayer);
    }

    function setRewardTiers(uint96[] calldata newTiers) external onlyOwner {
        if (newTiers.length == 0) revert InvalidParams();
        uint256 sum;
        for (uint256 i = 0; i < newTiers.length; i++) {
            sum += newTiers[i];
        }
        if (sum > MAX_BPS) revert InvalidParams();
        rewardTierBps = newTiers;
        emit RewardTiersUpdated(newTiers);
    }

    function setRakeConfig(
        uint96 newHouseRakeBps,
        uint96 newJackpotContributionBps,
        uint64 newScoreGracePeriod
    ) external onlyOwner {
        if (newHouseRakeBps + newJackpotContributionBps >= MAX_BPS) revert InvalidParams();
        houseRakeBps = newHouseRakeBps;
        jackpotContributionBps = newJackpotContributionBps;
        scoreGracePeriod = newScoreGracePeriod;
    }

    function withdrawTreasury(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount > treasuryAccrual) revert InvalidParams();
        treasuryAccrual -= amount;
        (bool success, ) = to.call{value: amount}("");
        require(success, "TREASURY_WITHDRAW_FAIL");
        emit TreasuryWithdrawn(to, amount);
    }

    function seedJackpot() external payable {
        jackpotVault += msg.value;
    }

    function moveJackpotToRound(uint256 roundId, uint256 amount) external onlyOwner {
        Round storage round = rounds[roundId];
        if (round.endTime == 0) revert InvalidRound();
        if (amount > jackpotVault) revert InvalidParams();
        jackpotVault -= amount;
        round.prizePool += amount;
        emit RoundFunded(roundId, amount, address(this));
    }

    /*//////////////////////////////////////////////////////////////
                                  VIEWS
    //////////////////////////////////////////////////////////////*/

    function rewardTierCount() external view returns (uint256) {
        return rewardTierBps.length;
    }

    function getPlayerScore(uint256 roundId, address player) external view returns (ScoreSubmissionState memory) {
        return scores[roundId][player];
    }
}

