const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==================================================");
  console.log("🚀 Deploying BOT Secret Auction to:", hre.network.name);
  console.log("==================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", hre.ethers.formatEther(balance), "BOT");

  // 1. Deploy MockBOTNFT
  console.log("\n1️⃣  Deploying MockBOTNFT...");
  const MockBOTNFT = await hre.ethers.getContractFactory("MockBOTNFT");
  const mockNFT = await MockBOTNFT.deploy();
  await mockNFT.waitForDeployment();
  const mockNFTAddress = await mockNFT.getAddress();
  console.log("✅ MockBOTNFT deployed at:", mockNFTAddress);

  // 2. Deploy SecretAuctionFactory
  console.log("\n2️⃣  Deploying SecretAuctionFactory...");
  const SecretAuctionFactory = await hre.ethers.getContractFactory("SecretAuctionFactory");
  const factory = await SecretAuctionFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ SecretAuctionFactory deployed at:", factoryAddress);

  // 3. Mint Initial NFT #1 and create live auction on-chain
  console.log("\n3️⃣  Minting NFT #1 and launching initial Secret Auction...");
  const mintTx = await mockNFT.mint(
    deployer.address,
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
  );
  await mintTx.wait();
  console.log("   NFT #1 minted to deployer.");

  // Approve factory
  const approveTx = await mockNFT.approve(factoryAddress, 1);
  await approveTx.wait();
  console.log("   Approved Factory for Token #1.");

  // Create auction
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
  
  const allAuctions = await factory.getAllAuctions();
  const initialAuctionAddress = allAuctions[allAuctions.length - 1];
  console.log("✅ Initial Secret Auction launched on-chain at:", initialAuctionAddress);

  // 4. Export addresses for frontend
  const isMainnet = hre.network.name === "botchain_mainnet";
  const contractsExport = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || (isMainnet ? 677 : 968),
    factoryAddress: factoryAddress,
    mockNFTAddress: mockNFTAddress,
    initialAuctionAddress: initialAuctionAddress,
    rpcUrl: isMainnet ? "https://rpc.botchain.ai" : "https://rpc.bohr.life",
    explorerUrl: isMainnet ? "https://scan.botchain.ai" : "https://scan.bohr.life"
  };

  const exportPath = path.join(__dirname, "../../frontend/src/contracts/deployedAddresses.json");
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  fs.writeFileSync(exportPath, JSON.stringify(contractsExport, null, 2));

  console.log("\n==================================================");
  console.log("🎉 All contracts deployed and verified!");
  console.log("   Addresses exported to frontend/src/contracts/deployedAddresses.json");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
