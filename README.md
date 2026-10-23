# BOT Secret Auction

A sealed-bid (commit-reveal) NFT auction platform built on **BOT Chain Mainnet** (Chain ID: `677`).

## ⚡ Features

- **Sealed-Bid Cryptography**: Bidders commit a cryptographic hash `keccak256(amount, secret, msg.sender)` along with obfuscated deposit value so competitor bids remain completely private until the reveal phase.
- **Fair Settlement & Anti-Griefing**: Bids revealed in the reveal window determine the highest bidder. Unrevealed commitments incur an anti-griefing penalty to discourage spam and non-reveals.
- **Flexible NFT Creation**:
  - Direct local image upload (encoded in on-chain URI)
  - Custom HTTP / IPFS artwork links
  - Curated Cyberpunk presets
  - Metadata-only / No-image NFT mode
- **Real-Time On-Chain Tracking**: Integrated with `@reown/appkit`, `wagmi`, and `viem` on BOT Chain Mainnet.

## 🔗 Verified Smart Contracts (BOT Chain Mainnet)

- **MockBOTNFT**: [`0x5995F44bB99BaBb4Fb44089012AC3A9def0Cd993`](https://scan.botchain.ai/address/0x5995F44bB99BaBb4Fb44089012AC3A9def0Cd993#code)
- **SecretAuctionFactory**: [`0xA00fB6Ad5C7D4c8A39562205A45aEDe9E91B93dD`](https://scan.botchain.ai/address/0xA00fB6Ad5C7D4c8A39562205A45aEDe9E91B93dD#code)
- **SecretAuction (Live #1)**: [`0x0e731937a27BE3CAB73906d1611Ea9Cc73e4Fa25`](https://scan.botchain.ai/address/0x0e731937a27BE3CAB73906d1611Ea9Cc73e4Fa25#code)

## 📁 Repository Structure

```
.
├── contracts/          # Hardhat project with Solidity contracts, deployment scripts & tests
└── frontend/           # Next.js 14 App Router dApp with Wagmi + AppKit + Viem
```

## 🚀 Getting Started

### 1. Smart Contracts
```bash
cd contracts
npm install
npm test
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the dApp.
