export enum AuctionPhase {
  BIDDING = 0,
  REVEALING = 1,
  SETTLED = 2,
  CANCELLED = 3,
}

export interface AuctionData {
  address: string;
  seller: string;
  nftContract: string;
  tokenId: number;
  reservePrice: string; // in BOT
  biddingEndTime: number; // unix timestamp in seconds
  revealEndTime: number; // unix timestamp in seconds
  state: AuctionPhase;
  totalCommitments: number;
  totalReveals: number;
  highestBidder: string;
  highestBid: string; // in BOT
  nftName?: string;
  nftImage?: string;
  nftDescription?: string;
}

export interface StoredCommitment {
  auctionAddress: string;
  bidderAddress: string;
  tokenId: number;
  bidAmount: string; // formatted in BOT (e.g. "500")
  depositAmount: string; // formatted in BOT (e.g. "600")
  secret: string;
  commitmentHash: string;
  timestamp: number;
  revealed: boolean;
}

export interface SimulatorBidder {
  id: string;
  name: string;
  address: string;
  avatar: string;
  color: string;
  bidAmount: string;
  depositAmount: string;
  secret: string;
  commitmentHash?: string;
  status: 'idle' | 'committed' | 'revealed';
}
