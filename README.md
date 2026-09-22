# BOT Secret Auction

A sealed-bid (commit-reveal) NFT auction platform built on **BOT Chain** (Chain ID: `968`).

## ⚡ Features

- **Sealed-Bid Cryptography**: Bidders commit a cryptographic hash `keccak256(amount, secret, msg.sender)` along with obfuscated deposit value so competitor bids remain completely private until the reveal phase.
- **Fair Settlement & Anti-Griefing**: Bids revealed in the reveal window determine the highest bidder. Unrevealed commitments incur an anti-griefing penalty to discourage spam and non-reveals.
- **Flexible NFT Creation**:
  - Direct local image upload (encoded in on-chain URI)
  - Custom HTTP / IPFS artwork links
  - Curated Cyberpunk presets
  - Metadata-only / No-image NFT mode
- **Real-Time On-Chain Tracking**: Integrated with `@reown/appkit`, `wagmi`, and `viem` on BOT Chain Testnet.

## 🔗 Verified Smart Contracts (BOT Chain Testnet)

- **MockBOTNFT**: [`0x69c31D1E02721dbE1eBE4D3d7CC099Fc7d31246A`](https://scan.bohr.life/address/0x69c31D1E02721dbE1eBE4D3d7CC099Fc7d31246A#code)
- **SecretAuctionFactory**: [`0x6E3866892d88d26764E06bB473DF03701c7ec6Da`](https://scan.bohr.life/address/0x6E3866892d88d26764E06bB473DF03701c7ec6Da#code)
- **SecretAuction (Live #1)**: [`0x3e6D6B739bE56A1B4878B47166b66D79615B52B0`](https://scan.bohr.life/address/0x3e6D6B739bE56A1B4878B47166b66D79615B52B0#code)

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
