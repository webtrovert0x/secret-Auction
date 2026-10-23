# BOT Secret Auction: Decentralized Sealed-Bid Protocol for Non-Fungible Tokens

**Technical Whitepaper**  
**Version:** 1.0  
**Network:** BOT Chain Mainnet (Chain ID: 677)  
**Smart Contracts:** Fully Verified on BOTScan (scan.botchain.ai)  

---

## Abstract

Traditional public English and Dutch auctions in decentralized finance suffer from inherent structural vulnerabilities: MEV (Maximal Extractable Value), front-running, gas wars, last-second bid sniping, and adversarial copy-bidding. Public mempools and transparent state allow competitors to observe bids in real-time, distorting fair price discovery.

**BOT Secret Auction** is a decentralized, trustless, sealed-bid (commit-reveal) auction protocol deployed natively on BOT Chain. Utilizing cryptographic commitments with value obfuscation and game-theoretic penalty mechanics, BOT Secret Auction guarantees private bid submission during active bidding windows, prevents front-running, enforces economic penalties against non-revealing griefers, and automatically executes trustless settlement and instant on-chain refunds.

---

## 1. Introduction & Problem Statement

Public blockchain auctions commonly rely on open ascending-bid mechanisms (English auctions). In an open-state EVM environment, this design introduces severe inefficiencies:

1. **Front-Running & MEV Exploitation**: Searchers and predatory bidders monitor mempools to outbid genuine buyers by minimal increments with higher gas fees.
2. **Bid Sniping**: Rational bidders delay bidding until the final block, causing transaction congestion, block stuffing, and execution uncertainty.
3. **Price Manipulation & Bid Shading**: Transparent bid histories enable participants to infer competitors' private valuations, discouraging authentic maximum-willingness-to-pay bidding.
4. **Auctioneer / Shill Bidding**: Malicious sellers can artificially drive up prices using sybil accounts once genuine interest is signaled.

---

## 2. Cryptographic Architecture: The Commit-Reveal Mechanism

BOT Secret Auction resolves these challenges using a two-phase cryptographic state machine:

```
┌────────────────────────────────────────────────────────┐
│                      PHASE 1                           │
│               Bidding Window (Commit)                  │
│  - Compute H = keccak256(amount, secret, msg.sender)   │
│  - Send H + msg.value >= amount (Deposit Obfuscation)  │
│  - Bid amount & salt remain completely hidden          │
└──────────────────────────┬─────────────────────────────┘
                           │ Block Timestamp >= BiddingEndTime
┌──────────────────────────▼─────────────────────────────┐
│                      PHASE 2                           │
│                Reveal Window (Open)                    │
│  - Bidder submits (amount, secret)                     │
│  - Contract computes hash & checks match               │
│  - Verify msg.value >= amount                          │
│  - Update highestBid & highestBidder                   │
└──────────────────────────┬─────────────────────────────┘
                           │ Block Timestamp >= RevealEndTime
┌──────────────────────────▼─────────────────────────────┐
│                      SETTLEMENT                        │
│  - Winner receives ERC-721 token                       │
│  - Seller receives winning bid minus protocol fee      │
│  - Losing bidders withdraw 100% of their deposits      │
│  - Unrevealed bids incur 5% anti-griefing penalty      │
└────────────────────────────────────────────────────────┘
```

### 2.1. Cryptographic Commitment Generation
Each bidder generates a 32-byte cryptographic commitment off-chain:

$$\mathcal{H} = \text{keccak256}(\text{abi.encodePacked}(\text{amount}, \text{secret}, \text{msg.sender}))$$

Where:
- $\text{amount}$: The real valuation/bid in native BOT tokens.
- $\text{secret}$: A cryptographically secure random string/salt.
- $\text{msg.sender}$: The bidder's wallet address (binding the commitment strictly to the origin address and preventing front-running of the hash itself).

### 2.2. Deposit Value Obfuscation
To prevent observers from deducing the true bid amount from transaction `msg.value`, the protocol allows bidders to attach an arbitrary deposit $\ge \text{amount}$:

$$\text{Deposit} = \text{amount} + \text{obfuscationValue}$$

External observers and mempool trackers only see the total deposit, masking the actual bid value $\mathcal{H}$.

### 2.3. Reveal Verification
During the reveal window, the bidder calls:
$$\text{revealBid}(\text{amount}, \text{secret})$$

The contract verifies:
1. $\text{keccak256}(\text{amount}, \text{secret}, \text{msg.sender}) == \text{bids}[\text{msg.sender}].\text{commitmentHash}$
2. $\text{bids}[\text{msg.sender}].\text{deposit} \ge \text{amount}$
3. $\text{amount} \ge \text{reservePrice}$

If valid, the bid is registered in on-chain state. Excess deposit $(\text{Deposit} - \text{amount})$ is credited back to the bidder.

---

## 3. Game-Theoretic Incentive Design & Anti-Griefing

A core flaw in naive commit-reveal auctions is the *selective non-reveal attack*, where a bidder inspects other reveals and intentionally withholds their secret if they regret their bid.

To achieve strict Nash equilibrium, BOT Secret Auction implements an **Anti-Griefing Penalty ($\mathcal{P} = 5\%$)**:

- **Revealed Losers**: Receive $100\%$ full refund of their deposit upon settlement.
- **Unrevealed Commitments**: If a participant commits a deposit but fails to reveal within the designated window, $5\%$ of their deposit is slashed ($2.5\%$ distributed to the seller, $2.5\%$ to the protocol fee reserve), and the remaining $95\%$ is returned.

This penalty parameter ensures that rational actors are incentivized to submit reveals, eliminating spam commitments and malicious griefing vectors.

---

## 4. Smart Contract Architecture

The protocol is designed as a modular, factory-driven architecture:

```
                ┌───────────────────────────┐
                │   SecretAuctionFactory    │
                └─────────────┬─────────────┘
                              │
               Deploys & tracks instances
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
   ┌────────▼────────┐                 ┌────────▼────────┐
   │  SecretAuction  │                 │  SecretAuction  │
   │   (Instance 1)  │                 │   (Instance 2)  │
   └────────┬────────┘                 └────────┬────────┘
            │                                   │
   Escrows ERC-721 NFT                 Escrows ERC-721 NFT
```

### 4.1. `SecretAuctionFactory.sol`
- Deploys immutable `SecretAuction` instances.
- Maintains global index of active and historic auctions.
- Emits indexed events for dApp telemetry and analytics.

### 4.2. `SecretAuction.sol`
- Non-custodial escrow for ERC-721 tokens (`IERC721Receiver`).
- State machine transitioning through `Created` $\to$ `Bidding` $\to$ `Reveal` $\to$ `Settled` / `Cancelled`.
- Protected by OpenZeppelin's `ReentrancyGuard` and pull-payment refund patterns.

### 4.3. `MockBOTNFT.sol`
- Full-featured ERC-721 token contract with arbitrary `tokenURI` support (base64 image data, IPFS, HTTP URIs, and metadata-only mode).

---

## 5. Deployed & Verified Contracts

The protocol is deployed and verified on **BOT Chain Mainnet**:

| Contract Name | Contract Address | Explorer Status |
| :--- | :--- | :--- |
| **SecretAuctionFactory** | `0xA00fB6Ad5C7D4c8A39562205A45aEDe9E91B93dD` | [Verified Code](https://scan.botchain.ai/address/0xA00fB6Ad5C7D4c8A39562205A45aEDe9E91B93dD#code) |
| **MockBOTNFT** | `0x5995F44bB99BaBb4Fb44089012AC3A9def0Cd993` | [Verified Code](https://scan.botchain.ai/address/0x5995F44bB99BaBb4Fb44089012AC3A9def0Cd993#code) |
| **SecretAuction (Live #1)** | `0x0e731937a27BE3CAB73906d1611Ea9Cc73e4Fa25` | [Verified Code](https://scan.botchain.ai/address/0x0e731937a27BE3CAB73906d1611Ea9Cc73e4Fa25#code) |

- **Chain ID**: `677`
- **RPC Endpoint**: `https://rpc.botchain.ai`
- **Explorer**: `https://scan.botchain.ai`

---

## 6. Security Considerations

- **Sender-Bound Commitments**: Binding `msg.sender` inside the hash prevents replay attacks where a front-runner copies another bidder's commitment.
- **Pull over Push Refunds**: Losing bidders withdraw refunds via isolated transactions (`withdrawRefund`), preventing denial-of-service (DoS) via malicious receiving fallbacks.
- **Time Invariance**: State transitions rely on explicit block timestamps (`block.timestamp >= biddingEndTime`), ensuring deterministic execution.

---

## 7. Conclusion

BOT Secret Auction delivers a production-grade, MEV-resistant auction standard for the BOT Chain ecosystem. By combining cryptographic commitments, value obfuscation, and game-theoretic anti-griefing mechanics, the protocol guarantees fair price discovery and robust asset liquidity for digital collectibles and real-world assets.
