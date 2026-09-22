// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SecretAuction.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title SecretAuctionFactory
 * @notice Factory for launching new sealed-bid secret auctions on BOT Chain.
 */
contract SecretAuctionFactory {
    address public feeRecipient;
    address[] public allAuctions;
    mapping(address => address[]) public userAuctions; // seller => auctions

    event AuctionCreated(
        address indexed auctionAddress,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 reservePrice,
        uint256 biddingEndTime,
        uint256 revealEndTime
    );

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient != address(0) ? _feeRecipient : msg.sender;
    }

    /**
     * @notice Deploy a new SecretAuction instance and transfer the NFT to it
     * @param nftContract Address of the ERC721 token
     * @param tokenId ID of the token being auctioned
     * @param reservePrice Starting price in wei (BOT)
     * @param biddingDuration Duration of bidding phase in seconds
     * @param revealDuration Duration of reveal phase in seconds
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 reservePrice,
        uint256 biddingDuration,
        uint256 revealDuration
    ) external returns (address) {
        SecretAuction auction = new SecretAuction(
            msg.sender,
            nftContract,
            tokenId,
            reservePrice,
            biddingDuration,
            revealDuration,
            feeRecipient
        );

        address auctionAddress = address(auction);
        allAuctions.push(auctionAddress);
        userAuctions[msg.sender].push(auctionAddress);

        // Transfer NFT from seller to the newly created auction
        IERC721(nftContract).safeTransferFrom(msg.sender, auctionAddress, tokenId);

        emit AuctionCreated(
            auctionAddress,
            msg.sender,
            nftContract,
            tokenId,
            reservePrice,
            block.timestamp + biddingDuration,
            block.timestamp + biddingDuration + revealDuration
        );

        return auctionAddress;
    }

    function getAuctionsCount() external view returns (uint256) {
        return allAuctions.length;
    }

    function getAllAuctions() external view returns (address[] memory) {
        return allAuctions;
    }

    function getUserAuctions(address user) external view returns (address[] memory) {
        return userAuctions[user];
    }
}
