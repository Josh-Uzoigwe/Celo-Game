// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Digital Marketplace with Escrow, Royalties, and Dispute Resolution
/// @notice Supports secure distribution of downloadable goods with platform fees,
///         creator royalties, resale, escrowed settlement, and dispute workflows.
contract DigitalMarketplace is MarketplaceReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event ItemListed(
        uint256 indexed itemId,
        address indexed seller,
        string name,
        uint256 price
    );
    event ItemUpdated(uint256 indexed itemId, uint256 newPrice, bool active);
    event ItemMetadataUpdated(uint256 indexed itemId, string newURI);
    event ItemRemoved(uint256 indexed itemId);
    event ItemResold(
        uint256 indexed parentPurchaseId,
        uint256 indexed newItemId,
        address indexed newSeller
    );
    event ItemPurchased(
        uint256 indexed purchaseId,
        uint256 indexed itemId,
        address indexed buyer,
        uint256 price
    );
    event DownloadKeyIssued(
        uint256 indexed purchaseId,
        bytes32 downloadKeyHash
    );
    event PurchaseSettled(
        uint256 indexed purchaseId,
        uint256 sellerAmount,
        uint256 creatorRoyalty,
        uint256 platformFee
    );
    event PurchaseRefunded(uint256 indexed purchaseId, uint256 refundedAmount);
    event DisputeOpened(uint256 indexed purchaseId, address indexed buyer);
    event DisputeResolved(
        uint256 indexed purchaseId,
        bool refunded,
        address resolver
    );
    event Withdrawal(address indexed account, uint256 amount);
    event PlatformFeeUpdated(uint96 newFeeBps);
    event FeeRecipientUpdated(address newRecipient);
    event DeliveryWindowUpdated(uint256 newWindow);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidItem();
    error InvalidPurchase();
    error InvalidPrice();
    error InactiveItem();
    error WrongNetwork();
    error AlreadyProcessed();
    error AccessDenied();
    error InvalidState();
    error NothingToWithdraw();
    error PendingDispute();

    /*//////////////////////////////////////////////////////////////
                                 DATA
    //////////////////////////////////////////////////////////////*/

    uint96 public constant MAX_BPS = 10_000;
    uint96 public constant CREATOR_ROYALTY_BPS = 500; // 5%

    enum PurchaseState {
        None,
        Pending,
        Ready,
        Settled,
        Refunded
    }

    struct Item {
        uint256 id;
        string name;
        string metadataURI; // Points to encrypted bundle / IPFS manifest
        bytes32 contentHash; // Keccak of downloadable payload
        address payable creator;
        address payable seller;
        uint256 price;
        uint64 networkId;
        bool active;
        bool resellable;
        uint256 parentPurchaseId;
    }

    struct Purchase {
        uint256 id;
        uint256 itemId;
        address buyer;
        address payable seller;
        address payable creator;
        uint256 amount;
        PurchaseState state;
        bool disputed;
        bytes32 downloadKeyHash;
        uint256 purchasedAt;
        uint256 downloadKeyIssuedAt;
    }

    struct Dispute {
        uint256 purchaseId;
        address buyer;
        string reason;
        bool resolved;
    }

    address public owner;
    address public feeRecipient;
    uint96 public platformFeeBps = 250; // 2.5% platform fee, configurable
    uint256 public deliveryWindow = 3 days;

    uint256 public itemCount;
    uint256 public purchaseCount;

    mapping(uint256 => Item) public items;
    mapping(uint256 => Purchase) public purchases;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256) public pendingWithdrawals;

    modifier onlyOwner() {
        if (msg.sender != owner) revert AccessDenied();
        _;
    }

    modifier itemExists(uint256 itemId) {
        if (itemId == 0 || itemId > itemCount) revert InvalidItem();
        _;
    }

    modifier purchaseExists(uint256 purchaseId) {
        if (purchaseId == 0 || purchaseId > purchaseCount)
            revert InvalidPurchase();
        _;
    }

    constructor() {
        owner = msg.sender;
        feeRecipient = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                              ADMIN CONTROLS
    //////////////////////////////////////////////////////////////*/

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        owner = newOwner;
    }

    function setPlatformFee(uint96 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1_000, "Fee too high"); // <=10%
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Zero recipient");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function setDeliveryWindow(uint256 newWindow) external onlyOwner {
        require(newWindow >= 1 hours, "Window too small");
        deliveryWindow = newWindow;
        emit DeliveryWindowUpdated(newWindow);
    }

    /*//////////////////////////////////////////////////////////////
                               ITEM LOGIC
    //////////////////////////////////////////////////////////////*/

    function listItem(
        string calldata name,
        string calldata metadataURI,
        bytes32 contentHash,
        uint256 price,
        bool resellable
    ) external returns (uint256 itemId) {
        if (price == 0) revert InvalidPrice();
        if (bytes(name).length == 0 || bytes(metadataURI).length == 0)
            revert("Missing metadata");
        if (contentHash == bytes32(0)) revert("Missing hash");

        itemId = ++itemCount;
        items[itemId] = Item({
            id: itemId,
            name: name,
            metadataURI: metadataURI,
            contentHash: contentHash,
            creator: payable(msg.sender),
            seller: payable(msg.sender),
            price: price,
            networkId: uint64(block.chainid),
            active: true,
            resellable: resellable,
            parentPurchaseId: 0
        });

        emit ItemListed(itemId, msg.sender, name, price);
    }

    function updateItemPrice(
        uint256 itemId,
        uint256 newPrice
    ) external itemExists(itemId) {
        if (newPrice == 0) revert InvalidPrice();
        Item storage item = items[itemId];
        if (msg.sender != item.seller) revert AccessDenied();
        item.price = newPrice;
        emit ItemUpdated(itemId, newPrice, item.active);
    }

    function toggleItemActive(
        uint256 itemId,
        bool active
    ) external itemExists(itemId) {
        Item storage item = items[itemId];
        if (msg.sender != item.seller && msg.sender != owner)
            revert AccessDenied();
        item.active = active;
        emit ItemUpdated(itemId, item.price, active);
    }

    function updateItemMetadata(
        uint256 itemId,
        string calldata newURI,
        bytes32 newContentHash
    ) external itemExists(itemId) {
        Item storage item = items[itemId];
        if (msg.sender != item.seller) revert AccessDenied();
        if (bytes(newURI).length == 0 || newContentHash == bytes32(0))
            revert("Missing metadata");
        item.metadataURI = newURI;
        item.contentHash = newContentHash;
        emit ItemMetadataUpdated(itemId, newURI);
    }

    function removeItem(uint256 itemId) external itemExists(itemId) {
        Item storage item = items[itemId];
        if (msg.sender != item.seller && msg.sender != owner)
            revert AccessDenied();
        item.active = false;
        item.price = 0;
        emit ItemRemoved(itemId);
    }

    function relistFromPurchase(
        uint256 purchaseId,
        uint256 newPrice
    ) external purchaseExists(purchaseId) returns (uint256 newItemId) {
        Purchase storage purchase = purchases[purchaseId];
        Item storage parentItem = items[purchase.itemId];

        if (!parentItem.resellable) revert("Not resellable");
        if (purchase.state != PurchaseState.Settled) revert InvalidState();
        if (purchase.buyer != msg.sender) revert AccessDenied();
        if (newPrice == 0) revert InvalidPrice();

        newItemId = ++itemCount;
        items[newItemId] = Item({
            id: newItemId,
            name: parentItem.name,
            metadataURI: parentItem.metadataURI,
            contentHash: parentItem.contentHash,
            creator: parentItem.creator,
            seller: payable(msg.sender),
            price: newPrice,
            networkId: parentItem.networkId,
            active: true,
            resellable: parentItem.resellable,
            parentPurchaseId: purchaseId
        });

        emit ItemResold(purchaseId, newItemId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                              PURCHASE FLOW
    //////////////////////////////////////////////////////////////*/

    function buyItem(
        uint256 itemId
    ) external payable nonReentrant itemExists(itemId) returns (uint256) {
        Item storage item = items[itemId];
        if (!item.active) revert InactiveItem();
        if (item.networkId != uint64(block.chainid)) revert WrongNetwork();
        if (msg.value != item.price) revert InvalidPrice();

        uint256 purchaseId = ++purchaseCount;
        purchases[purchaseId] = Purchase({
            id: purchaseId,
            itemId: itemId,
            buyer: msg.sender,
            seller: item.seller,
            creator: item.creator,
            amount: msg.value,
            state: PurchaseState.Pending,
            disputed: false,
            downloadKeyHash: bytes32(0),
            purchasedAt: block.timestamp,
            downloadKeyIssuedAt: 0
        });

        emit ItemPurchased(purchaseId, itemId, msg.sender, msg.value);
        return purchaseId;
    }

    function grantDownloadKey(
        uint256 purchaseId,
        bytes32 downloadKeyHash
    ) external purchaseExists(purchaseId) {
        Purchase storage purchase = purchases[purchaseId];
        if (purchase.seller != msg.sender) revert AccessDenied();
        if (purchase.state != PurchaseState.Pending) revert InvalidState();
        if (downloadKeyHash == bytes32(0)) revert("Invalid key hash");
        purchase.downloadKeyHash = downloadKeyHash;
        purchase.state = PurchaseState.Ready;
        purchase.downloadKeyIssuedAt = block.timestamp;

        emit DownloadKeyIssued(purchaseId, downloadKeyHash);
    }

    function confirmDelivery(
        uint256 purchaseId,
        bytes32 plaintextKey
    ) external purchaseExists(purchaseId) nonReentrant {
        Purchase storage purchase = purchases[purchaseId];
        if (purchase.buyer != msg.sender) revert AccessDenied();
        if (purchase.state != PurchaseState.Ready) revert InvalidState();
        if (
            keccak256(abi.encodePacked(plaintextKey)) != purchase.downloadKeyHash
        ) revert("Invalid key");

        _settlePurchase(purchaseId);
    }

    function releaseAfterTimeout(
        uint256 purchaseId
    ) external purchaseExists(purchaseId) nonReentrant {
        Purchase storage purchase = purchases[purchaseId];
        if (purchase.state != PurchaseState.Ready) revert InvalidState();
        if (purchase.seller != msg.sender && msg.sender != owner)
            revert AccessDenied();
        if (
            block.timestamp <
            purchase.downloadKeyIssuedAt + deliveryWindow
        ) revert("Delivery window active");

        _settlePurchase(purchaseId);
    }

    function requestRefund(uint256 purchaseId) external purchaseExists(purchaseId) {
        Purchase storage purchase = purchases[purchaseId];
        if (purchase.buyer != msg.sender) revert AccessDenied();
        if (purchase.state != PurchaseState.Pending) revert InvalidState();
        if (
            block.timestamp <
            purchase.purchasedAt + deliveryWindow
        ) revert("Delivery window active");

        _refundBuyer(purchaseId);
    }

    /*//////////////////////////////////////////////////////////////
                             DISPUTE HANDLING
    //////////////////////////////////////////////////////////////*/

    function openDispute(
        uint256 purchaseId,
        string calldata reason
    ) external purchaseExists(purchaseId) {
        Purchase storage purchase = purchases[purchaseId];
        if (purchase.buyer != msg.sender) revert AccessDenied();
        if (purchase.state == PurchaseState.Settled) revert AlreadyProcessed();
        if (purchase.disputed) revert PendingDispute();

        purchase.disputed = true;
        disputes[purchaseId] = Dispute({
            purchaseId: purchaseId,
            buyer: msg.sender,
            reason: reason,
            resolved: false
        });

        emit DisputeOpened(purchaseId, msg.sender);
    }

    function resolveDispute(
        uint256 purchaseId,
        bool refundBuyer
    ) external onlyOwner purchaseExists(purchaseId) {
        Purchase storage purchase = purchases[purchaseId];
        Dispute storage dispute = disputes[purchaseId];

        if (!purchase.disputed || dispute.resolved) revert InvalidState();

        dispute.resolved = true;
        purchase.disputed = false;

        if (refundBuyer) {
            _refundBuyer(purchaseId);
        } else {
            if (purchase.state == PurchaseState.Pending) {
                purchase.state = PurchaseState.Ready;
                purchase.downloadKeyIssuedAt = block.timestamp;
            }
            _settlePurchase(purchaseId);
        }

        emit DisputeResolved(purchaseId, refundBuyer, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                                WITHDRAW
    //////////////////////////////////////////////////////////////*/

    function withdraw(uint256 amount) external nonReentrant {
        uint256 balance = pendingWithdrawals[msg.sender];
        if (balance == 0 || amount == 0 || amount > balance)
            revert NothingToWithdraw();
        pendingWithdrawals[msg.sender] = balance - amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    function withdrawAll() external {
        withdraw(pendingWithdrawals[msg.sender]);
    }

    /*//////////////////////////////////////////////////////////////
                              INTERNAL LOGIC
    //////////////////////////////////////////////////////////////*/

    function _settlePurchase(uint256 purchaseId) internal {
        Purchase storage purchase = purchases[purchaseId];
        if (purchase.state != PurchaseState.Ready)
            revert InvalidState();

        purchase.state = PurchaseState.Settled;

        uint256 platformFee = (purchase.amount * platformFeeBps) / MAX_BPS;
        uint256 creatorRoyalty = 0;
        uint256 sellerAmount = purchase.amount - platformFee;

        if (purchase.creator != purchase.seller) {
            creatorRoyalty =
                (purchase.amount * CREATOR_ROYALTY_BPS) /
                MAX_BPS;
            if (creatorRoyalty > sellerAmount) {
                creatorRoyalty = sellerAmount;
            }
            sellerAmount -= creatorRoyalty;
            pendingWithdrawals[purchase.creator] += creatorRoyalty;
        }

        pendingWithdrawals[purchase.seller] += sellerAmount;
        pendingWithdrawals[feeRecipient] += platformFee;

        emit PurchaseSettled(
            purchaseId,
            sellerAmount,
            creatorRoyalty,
            platformFee
        );
    }

    function _refundBuyer(uint256 purchaseId) internal nonReentrant {
        Purchase storage purchase = purchases[purchaseId];
        if (
            purchase.state == PurchaseState.Refunded ||
            purchase.state == PurchaseState.Settled
        ) revert AlreadyProcessed();

        purchase.state = PurchaseState.Refunded;

        pendingWithdrawals[purchase.buyer] += purchase.amount;

        emit PurchaseRefunded(purchaseId, purchase.amount);
    }
}

/// @dev Lightweight reentrancy guard reused to avoid pulling full OZ stack.
abstract contract MarketplaceReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "Reentrancy detected");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

