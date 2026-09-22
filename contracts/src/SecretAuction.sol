// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SecretAuction
 * @notice Sealed-Bid commit-reveal auction contract on BOT Chain.
 * @dev Bids are committed during the bidding window as keccak256(amount, secret, bidder).
 *      During reveal window, bidders reveal amount & secret.
 *      Winning bidder receives NFT; seller receives winning bid minus fee.
 *      Losers & unrevealed deposits can be withdrawn after settlement.
 */
contract SecretAuction is ReentrancyGuard {
    enum AuctionState { BIDDING, REVEALING, SETTLED, CANCELLED }

    struct BidderCommitment {
        bytes32 commitmentHash;
        uint256 deposit;
        uint256 revealedBid;
        bool revealed;
        bool refunded;
    }

    address public immutable seller;
    IERC721 public immutable nftContract;
    uint256 public immutable tokenId;
    uint256 public immutable reservePrice; // Minimum starting price in wei
    uint256 public immutable biddingEndTime;
    uint256 public immutable revealEndTime;
    address public immutable feeRecipient;
    uint256 public constant PROTOCOL_FEE_BPS = 200; // 2% fee (basis points)
    uint256 public constant UNREVEALED_PENALTY_BPS = 500; // 5% penalty for griefing/not revealing

    AuctionState public state;
    address public highestBidder;
    uint256 public highestBid;
    uint256 public totalCommitments;
    uint256 public totalReveals;

    mapping(address => BidderCommitment) public bids;
    address[] public bidderList;

    // Events
    event BidCommitted(address indexed bidder, bytes32 commitmentHash, uint256 deposit);
    event BidRevealed(address indexed bidder, uint256 amount, bool isHighest);
    event AuctionSettled(address indexed winner, uint256 winningBid, address seller);
    event RefundClaimed(address indexed bidder, uint256 amount);
    event AuctionCancelled();

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller");
        _;
    }

    modifier inState(AuctionState _state) {
        require(getCurrentState() == _state, "Invalid auction state");
        _;
    }

    constructor(
        address _seller,
        address _nftContract,
        uint256 _tokenId,
        uint256 _reservePrice,
        uint256 _biddingDuration,
        uint256 _revealDuration,
        address _feeRecipient
    ) {
        require(_seller != address(0), "Invalid seller");
        require(_nftContract != address(0), "Invalid NFT");
        require(_biddingDuration >= 60, "Bidding duration too short");
        require(_revealDuration >= 60, "Reveal duration too short");

        seller = _seller;
        nftContract = IERC721(_nftContract);
        tokenId = _tokenId;
        reservePrice = _reservePrice;
        biddingEndTime = block.timestamp + _biddingDuration;
        revealEndTime = block.timestamp + _biddingDuration + _revealDuration;
        feeRecipient = _feeRecipient;
        state = AuctionState.BIDDING;
    }

    /**
     * @notice Dynamically calculates state based on block timestamp
     */
    function getCurrentState() public view returns (AuctionState) {
        if (state == AuctionState.SETTLED || state == AuctionState.CANCELLED) {
            return state;
        }
        if (block.timestamp < biddingEndTime) {
            return AuctionState.BIDDING;
        }
        if (block.timestamp < revealEndTime) {
            return AuctionState.REVEALING;
        }
        return AuctionState.REVEALING; // Time is ready for settle()
    }

    /**
     * @notice Helper to generate cryptographic commitment hash
     * @dev Includes bidder address to prevent copy-paste / frontrunning reveals
     */
    function generateCommitment(
        uint256 amount,
        string memory secret,
        address bidder
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(amount, secret, bidder));
    }

    /**
     * @notice Submit a sealed bid commitment with deposit
     * @param commitmentHash keccak256(amount, secret, msg.sender)
     */
    function commitBid(bytes32 commitmentHash) external payable inState(AuctionState.BIDDING) nonReentrant {
        require(msg.value >= reservePrice, "Deposit below reserve price");
        require(commitmentHash != bytes32(0), "Invalid commitment hash");

        BidderCommitment storage userBid = bids[msg.sender];
        if (userBid.deposit == 0) {
            bidderList.push(msg.sender);
            totalCommitments++;
        }

        userBid.commitmentHash = commitmentHash;
        userBid.deposit += msg.value;
        userBid.revealed = false;
        userBid.refunded = false;

        emit BidCommitted(msg.sender, commitmentHash, userBid.deposit);
    }

    /**
     * @notice Reveal bid during reveal window
     * @param amount The actual bid amount in BOT wei
     * @param secret The secret passphrase used when committing
     */
    function revealBid(uint256 amount, string calldata secret) external nonReentrant {
        require(block.timestamp >= biddingEndTime, "Bidding still active");
        require(block.timestamp < revealEndTime, "Reveal phase ended");
        require(state != AuctionState.SETTLED && state != AuctionState.CANCELLED, "Auction ended");

        BidderCommitment storage userBid = bids[msg.sender];
        require(userBid.commitmentHash != bytes32(0), "No commitment found");
        require(!userBid.revealed, "Already revealed");

        // Verify hash
        bytes32 expectedHash = keccak256(abi.encodePacked(amount, secret, msg.sender));
        require(expectedHash == userBid.commitmentHash, "Invalid bid amount or secret");
        require(userBid.deposit >= amount, "Deposit less than bid amount");
        require(amount >= reservePrice, "Bid below reserve price");

        userBid.revealed = true;
        userBid.revealedBid = amount;
        totalReveals++;

        bool isHighest = false;
        if (amount > highestBid) {
            highestBid = amount;
            highestBidder = msg.sender;
            isHighest = true;
        }

        emit BidRevealed(msg.sender, amount, isHighest);
    }

    /**
     * @notice Settle the auction after reveal phase ends
     */
    function settle() external nonReentrant {
        require(block.timestamp >= revealEndTime, "Reveal phase not ended");
        require(state != AuctionState.SETTLED && state != AuctionState.CANCELLED, "Already finalized");

        state = AuctionState.SETTLED;

        if (highestBidder != address(0)) {
            // Winning bid settlement
            uint256 fee = (highestBid * PROTOCOL_FEE_BPS) / 10000;
            uint256 sellerProceeds = highestBid - fee;

            // Mark winner as refunded/handled
            bids[highestBidder].refunded = true;
            uint256 winnerExcessDeposit = bids[highestBidder].deposit - highestBid;

            // Transfer NFT to winner
            nftContract.safeTransferFrom(address(this), highestBidder, tokenId);

            // Transfer funds to seller and fee recipient
            if (fee > 0 && feeRecipient != address(0)) {
                (bool feeSuccess, ) = payable(feeRecipient).call{value: fee}("");
                require(feeSuccess, "Fee transfer failed");
            }

            (bool sellerSuccess, ) = payable(seller).call{value: sellerProceeds}("");
            require(sellerSuccess, "Seller payment failed");

            // Return excess deposit to winner if any
            if (winnerExcessDeposit > 0) {
                (bool refundSuccess, ) = payable(highestBidder).call{value: winnerExcessDeposit}("");
                require(refundSuccess, "Winner refund failed");
            }

            emit AuctionSettled(highestBidder, highestBid, seller);
        } else {
            // No valid bids revealed: return NFT to seller
            nftContract.safeTransferFrom(address(this), seller, tokenId);
            emit AuctionSettled(address(0), 0, seller);
        }
    }

    /**
     * @notice Withdraw deposit for losing bidders or unrevealed bidders
     */
    function withdrawRefund() external nonReentrant {
        require(state == AuctionState.SETTLED, "Auction not settled yet");
        BidderCommitment storage userBid = bids[msg.sender];
        require(userBid.deposit > 0, "No deposit");
        require(!userBid.refunded, "Refund already processed");
        require(msg.sender != highestBidder, "Winner cannot withdraw bid");

        userBid.refunded = true;
        uint256 refundAmount;

        if (userBid.revealed) {
            // Full deposit refunded for revealed losing bidder
            refundAmount = userBid.deposit;
        } else {
            // Unrevealed bidder penalized to discourage griefing
            uint256 penalty = (userBid.deposit * UNREVEALED_PENALTY_BPS) / 10000;
            refundAmount = userBid.deposit - penalty;

            // Send penalty to seller
            if (penalty > 0) {
                (bool penaltySuccess, ) = payable(seller).call{value: penalty}("");
                require(penaltySuccess, "Penalty transfer failed");
            }
        }

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        emit RefundClaimed(msg.sender, refundAmount);
    }

    /**
     * @notice Seller can cancel if 0 bids submitted during bidding phase
     */
    function cancelAuction() external onlySeller nonReentrant {
        require(state == AuctionState.BIDDING, "Cannot cancel now");
        require(totalCommitments == 0, "Cannot cancel with active bids");

        state = AuctionState.CANCELLED;
        nftContract.safeTransferFrom(address(this), seller, tokenId);

        emit AuctionCancelled();
    }

    /**
     * @notice Get auction summary details
     */
    function getAuctionDetails() external view returns (
        address _seller,
        address _nftContract,
        uint256 _tokenId,
        uint256 _reservePrice,
        uint256 _biddingEndTime,
        uint256 _revealEndTime,
        AuctionState _state,
        uint256 _totalCommitments,
        uint256 _totalReveals,
        address _highestBidder,
        uint256 _highestBid
    ) {
        return (
            seller,
            address(nftContract),
            tokenId,
            reservePrice,
            biddingEndTime,
            revealEndTime,
            getCurrentState(),
            totalCommitments,
            totalReveals,
            highestBidder,
            highestBid
        );
    }

    /**
     * @notice Check user status in this auction
     */
    function getUserStatus(address user) external view returns (
        bool hasCommitted,
        bytes32 commitmentHash,
        uint256 deposit,
        bool revealed,
        uint256 revealedBid,
        bool refunded
    ) {
        BidderCommitment memory b = bids[user];
        return (
            b.commitmentHash != bytes32(0),
            b.commitmentHash,
            b.deposit,
            b.revealed,
            b.revealedBid,
            b.refunded
        );
    }

    // Allow receiving NFT via safeTransferFrom
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
