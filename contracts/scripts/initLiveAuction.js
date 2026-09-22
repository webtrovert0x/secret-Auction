const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating initial live auction on BOT Chain with deployer:", deployer.address);

  const factoryAddress = "0x5c21C24DF7DB213AA6E938a0aC0b28AFF69dA4F4";
  const mockNFTAddress = "0x70362672333E3FE07E2aB93011bD69Fd2bc6e121";

  const MockBOTNFT = await hre.ethers.getContractFactory("MockBOTNFT");
  const mockNFT = MockBOTNFT.attach(mockNFTAddress);

  const SecretAuctionFactory = await hre.ethers.getContractFactory("SecretAuctionFactory");
  const factory = SecretAuctionFactory.attach(factoryAddress);

  // Mint Token #1
  console.log("Minting NFT #1 to deployer...");
  const mintTx = await mockNFT.mint(deployer.address, "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe");
  await mintTx.wait();
  console.log("✅ Minted NFT #1");

  // Approve factory
  console.log("Approving factory...");
  const appTx = await mockNFT.approve(factoryAddress, 1);
  await appTx.wait();

  // Create auction
  console.log("Deploying Secret Auction for NFT #1...");
  const reservePrice = hre.ethers.parseEther("1.0"); // 1 BOT
  const biddingDuration = 86400; // 24 hours
  const revealDuration = 7200; // 2 hours

  const createTx = await factory.createAuction(
    mockNFTAddress,
    1,
    reservePrice,
    biddingDuration,
    revealDuration
  );
  await createTx.wait();

  const auctions = await factory.getAllAuctions();
  const liveAuctionAddress = auctions[auctions.length - 1];
  console.log("🎉 Live Secret Auction Contract Deployed at:", liveAuctionAddress);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
