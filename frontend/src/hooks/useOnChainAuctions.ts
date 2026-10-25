'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { botChain } from '@/config/chains';
import deployedAddresses from '@/contracts/deployedAddresses.json';
import SecretAuctionFactoryABI from '@/contracts/SecretAuctionFactoryABI.json';
import SecretAuctionABI from '@/contracts/SecretAuctionABI.json';
import MockNFTABI from '@/contracts/MockNFTABI.json';
import { AuctionData, AuctionPhase } from '@/lib/types';

const publicClient = createPublicClient({
  chain: botChain,
  transport: http('https://rpc.botchain.ai'),
});

const DEFAULT_NFT_IMAGES: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
  2: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop',
  3: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop',
};

export function useOnChainAuctions() {
  const [auctions, setAuctions] = useState<AuctionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuctions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const factoryAddress = deployedAddresses.factoryAddress as `0x${string}`;

      // 1. Fetch all deployed auction addresses from Factory
      const auctionAddresses = (await publicClient.readContract({
        address: factoryAddress,
        abi: SecretAuctionFactoryABI,
        functionName: 'getAllAuctions',
      })) as `0x${string}`[];

      if (!auctionAddresses || auctionAddresses.length === 0) {
        setAuctions([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch details for each auction contract directly on-chain
      const detailsPromises = auctionAddresses.map(async (auctionAddr) => {
        try {
          const details = (await publicClient.readContract({
            address: auctionAddr,
            abi: SecretAuctionABI,
            functionName: 'getAuctionDetails',
          })) as [
            string, // seller
            string, // nftContract
            bigint, // tokenId
            bigint, // reservePrice
            bigint, // biddingEndTime
            bigint, // revealEndTime
            number, // state
            bigint, // totalCommitments
            bigint, // totalReveals
            string, // highestBidder
            bigint  // highestBid
          ];

          const [
            seller,
            nftContract,
            tokenIdBig,
            reservePriceWei,
            biddingEndTimeBig,
            revealEndTimeBig,
            stateRaw,
            totalCommitmentsBig,
            totalRevealsBig,
            highestBidder,
            highestBidWei,
          ] = details;

          const tokenId = Number(tokenIdBig);

          // Attempt to fetch on-chain tokenURI
          let tokenURI = '';
          try {
            tokenURI = (await publicClient.readContract({
              address: nftContract as `0x${string}`,
              abi: MockNFTABI,
              functionName: 'tokenURI',
              args: [tokenIdBig],
            })) as string;
          } catch (e) {
            // fallback if not implemented or external NFT
          }

          // Process tokenURI
          let nftImage = '';
          if (tokenURI) {
            if (tokenURI === 'no-image' || tokenURI === 'none') {
              nftImage = '';
            } else if (tokenURI.startsWith('data:image/') || tokenURI.startsWith('http://') || tokenURI.startsWith('https://')) {
              nftImage = tokenURI;
            } else if (tokenURI.startsWith('ipfs://')) {
              nftImage = `https://ipfs.io/ipfs/${tokenURI.replace('ipfs://', '')}`;
            } else {
              nftImage = tokenURI;
            }
          } else {
            nftImage = DEFAULT_NFT_IMAGES[tokenId] || '';
          }

          const item: AuctionData = {
            address: auctionAddr,
            seller,
            nftContract,
            tokenId,
            reservePrice: formatEther(reservePriceWei),
            biddingEndTime: Number(biddingEndTimeBig),
            revealEndTime: Number(revealEndTimeBig),
            state: Number(stateRaw) as AuctionPhase,
            totalCommitments: Number(totalCommitmentsBig),
            totalReveals: Number(totalRevealsBig),
            highestBidder,
            highestBid: formatEther(highestBidWei),
            nftName: `BOT Cyber Artifact #${tokenId}`,
            nftImage,
            nftDescription: 'Verified on-chain sealed-bid cryptographic auction on BOT Chain.',
          };

          return item;
        } catch (err) {
          console.error(`Error fetching details for auction ${auctionAddr}:`, err);
          return null;
        }
      });

      const results = await Promise.all(detailsPromises);
      const validAuctions = results.filter((a): a is AuctionData => a !== null);
      
      setAuctions(validAuctions.reverse());
    } catch (err: any) {
      console.error('Failed to fetch on-chain auctions:', err);
      setError(err?.message || 'Error reading from BOT Chain RPC');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
    const interval = setInterval(fetchAuctions, 8000);
    return () => clearInterval(interval);
  }, [fetchAuctions]);

  return { auctions, isLoading, error, refetch: fetchAuctions };
}
