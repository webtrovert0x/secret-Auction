const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BOT Secret Auction System", function () {
  let MockNFT, mockNFT;
  let Factory, factory;
  let SecretAuction;
  let owner, seller, bidderA, bidderB, bidderC, feeRecipient;

  const reservePrice = ethers.parseEther("1.0"); // 1 BOT
  const biddingDuration = 300; // 5 min
  const revealDuration = 120; // 2 min

  beforeEach(async function () {
    [owner, seller, bidderA, bidderB, bidderC, feeRecipient] = await ethers.getSigners();

    // 1. Deploy Mock NFT
    MockNFT = await ethers.getContractFactory("MockBOTNFT");
    mockNFT = await MockNFT.deploy();
    await mockNFT.waitForDeployment();

    // Mint NFT #1 to seller
    await mockNFT.mint(seller.address, "ipfs://cyber-bot-127");

    // 2. Deploy Factory
    Factory = await ethers.getContractFactory("SecretAuctionFactory");
    factory = await Factory.deploy(feeRecipient.address);
    await factory.waitForDeployment();

    SecretAuction = await ethers.getContractFactory("SecretAuction");
  });

  it("Should create a secret auction and transfer NFT to it", async function () {
    // Approve factory to transfer NFT #1
    await mockNFT.connect(seller).approve(await factory.getAddress(), 1);

    // Create auction
    const tx = await factory.connect(seller).createAuction(
      await mockNFT.getAddress(),
      1,
      reservePrice,
      biddingDuration,
      revealDuration
    );

    const receipt = await tx.wait();
    const auctions = await factory.getAllAuctions();
    expect(auctions.length).to.equal(1);

    const auctionAddress = auctions[0];
    expect(await mockNFT.ownerOf(1)).to.equal(auctionAddress);
  });

  it("Should complete full commit-reveal-settle flow with winner", async function () {
    // Approve and create
    await mockNFT.connect(seller).approve(await factory.getAddress(), 1);
    await factory.connect(seller).createAuction(
      await mockNFT.getAddress(),
      1,
      reservePrice,
      biddingDuration,
      revealDuration
    );
    const auctionAddress = (await factory.getAllAuctions())[0];
    const auction = SecretAuction.attach(auctionAddress);

    // --- PHASE 1: COMMIT BIDS ---
    const bidA_amount = ethers.parseEther("5.0"); // 5 BOT
    const secretA = "banana123";
    const hashA = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "string", "address"],
        [bidA_amount, secretA, bidderA.address]
      )
    );

    const bidB_amount = ethers.parseEther("7.5"); // 7.5 BOT
    const secretB = "orange456";
    const hashB = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "string", "address"],
        [bidB_amount, secretB, bidderB.address]
      )
    );

    // Bidder A commits with 6 BOT deposit (over-depositing to mask true bid)
    await auction.connect(bidderA).commitBid(hashA, { value: ethers.parseEther("6.0") });

    // Bidder B commits with 10 BOT deposit
    await auction.connect(bidderB).commitBid(hashB, { value: ethers.parseEther("10.0") });

    expect(await auction.totalCommitments()).to.equal(2);

    // --- MOVE TO REVEAL PHASE ---
    await ethers.provider.send("evm_increaseTime", [biddingDuration + 1]);
    await ethers.provider.send("evm_mine");

    // Reveal Bidder A
    await auction.connect(bidderA).revealBid(bidA_amount, secretA);

    // Reveal Bidder B
    await auction.connect(bidderB).revealBid(bidB_amount, secretB);

    expect(await auction.highestBid()).to.equal(bidB_amount);
    expect(await auction.highestBidder()).to.equal(bidderB.address);

    // --- MOVE TO SETTLED PHASE ---
    await ethers.provider.send("evm_increaseTime", [revealDuration + 1]);
    await ethers.provider.send("evm_mine");

    // Settle
    const sellerBalBefore = await ethers.provider.getBalance(seller.address);
    await auction.settle();

    // Verify winner has NFT
    expect(await mockNFT.ownerOf(1)).to.equal(bidderB.address);

    // Verify seller received winning funds
    const sellerBalAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalAfter).to.be.gt(sellerBalBefore);

    // Bidder A withdraws refund
    const balABefore = await ethers.provider.getBalance(bidderA.address);
    await auction.connect(bidderA).withdrawRefund();
    const balAAfter = await ethers.provider.getBalance(bidderA.address);
    expect(balAAfter).to.be.gt(balABefore);
  });
});
