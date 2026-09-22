'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Trophy, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { AuctionData, AuctionPhase } from '@/lib/types';
import { getCommitmentForAuction } from '@/lib/storage';
import { useAccount, useWriteContract } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { botChain } from '@/config/chains';
import SecretAuctionABI from '@/contracts/SecretAuctionABI.json';

const publicClient = createPublicClient({
  chain: botChain,
  transport: http('https://rpc.bohr.life'),
});

interface AuctionCardProps {
  auction: AuctionData;
  onBidClick: (auction: AuctionData) => void;
  onRevealClick: (auction: AuctionData) => void;
  onSuccess: () => void;
}

export function AuctionCard({
  auction,
  onBidClick,
  onRevealClick,
  onSuccess,
}: AuctionCardProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [timeLeft, setTimeLeft] = useState({ text: '', phaseLabel: '', isReveal: false, isEnded: false });
  const [userCommitment, setUserCommitment] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkVault = () => {
      const stored = getCommitmentForAuction(auction.address, address);
      setUserCommitment(stored);
    };
    checkVault();
    const interval = setInterval(checkVault, 2000);
    return () => clearInterval(interval);
  }, [auction.address, address]);

  useEffect(() => {
    const calculateTime = () => {
      const now = Math.floor(Date.now() / 1000);

      if (auction.state === AuctionPhase.SETTLED || now >= auction.revealEndTime) {
        setTimeLeft({ text: 'Settled', phaseLabel: 'Complete', isReveal: false, isEnded: true });
        return;
      }

      if (now < auction.biddingEndTime) {
        const diff = auction.biddingEndTime - now;
        const hours = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        setTimeLeft({
          text: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
          phaseLabel: 'Bidding closes in',
          isReveal: false,
          isEnded: false,
        });
      } else {
        const diff = auction.revealEndTime - now;
        const hours = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        setTimeLeft({
          text: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
          phaseLabel: 'Reveal ends in',
          isReveal: true,
          isEnded: false,
        });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [auction.biddingEndTime, auction.revealEndTime, auction.state]);

  // Real On-Chain Settle
  const handleSettle = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet.');
      return;
    }
    try {
      setIsProcessing(true);
      const txHash = await writeContractAsync({
        address: auction.address as `0x${string}`,
        abi: SecretAuctionABI,
        functionName: 'settle',
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setIsProcessing(false);
      onSuccess();
    } catch (err: any) {
      console.error('Settle error:', err);
      alert(err?.shortMessage || err?.message || 'Settle failed on-chain.');
      setIsProcessing(false);
    }
  };

  // Real On-Chain Refund Withdrawal
  const handleWithdrawRefund = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet.');
      return;
    }
    try {
      setIsProcessing(true);
      const txHash = await writeContractAsync({
        address: auction.address as `0x${string}`,
        abi: SecretAuctionABI,
        functionName: 'withdrawRefund',
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setIsProcessing(false);
      onSuccess();
    } catch (err: any) {
      console.error('Refund withdrawal error:', err);
      alert(err?.shortMessage || err?.message || 'Refund withdrawal failed on-chain.');
      setIsProcessing(false);
    }
  };

  const isBiddingActive = !timeLeft.isReveal && !timeLeft.isEnded;
  const isRevealActive = timeLeft.isReveal && !timeLeft.isEnded;
  const isReadyToSettle = (timeLeft.isEnded || Math.floor(Date.now() / 1000) >= auction.revealEndTime) && auction.state !== AuctionPhase.SETTLED;
  const isSettled = auction.state === AuctionPhase.SETTLED;

  return (
    <div className="rounded-xl bg-[#131722] border border-[#1E2433] overflow-hidden flex flex-col justify-between hover:border-[#2D3748] transition-colors">
      
      {/* Image Banner or No-Image Token Banner */}
      <div className="relative aspect-square w-full bg-[#0B0D13] flex items-center justify-center border-b border-[#1E2433] overflow-hidden">
        {auction.nftImage ? (
          <img
            src={auction.nftImage}
            alt={auction.nftName || `NFT #${auction.tokenId}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#131722] to-[#0B0D13]">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-blue-400 font-mono text-xl font-bold">
              #{auction.tokenId}
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-gray-400 font-semibold">
              BOT ERC-721
            </span>
            <span className="text-[11px] font-mono text-gray-500 mt-1">
              Token ID: {auction.tokenId}
            </span>
          </div>
        )}

        {/* State Tag */}
        <div className="absolute top-3 left-3">
          {isBiddingActive && (
            <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur text-blue-400 text-xs font-mono font-medium flex items-center gap-1 border border-white/10">
              <Lock className="w-3 h-3" /> Secret Bidding
            </span>
          )}
          {isRevealActive && (
            <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur text-purple-400 text-xs font-mono font-medium flex items-center gap-1 border border-white/10">
              <Unlock className="w-3 h-3" /> Reveal Phase
            </span>
          )}
          {isSettled && (
            <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur text-emerald-400 text-xs font-mono font-medium flex items-center gap-1 border border-white/10">
              <Trophy className="w-3 h-3" /> Settled
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/80 backdrop-blur text-xs font-mono text-gray-300 border border-white/10">
          #{auction.tokenId}
        </div>

        {userCommitment && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 px-3 py-1.5 rounded-md bg-[#0B0D13]/90 backdrop-blur border border-white/10 text-xs flex items-center justify-between">
            <span className="text-gray-300 font-mono">Your Bid: <strong className="text-white">{userCommitment.bidAmount} BOT</strong></span>
            <span className={`text-[10px] font-bold ${userCommitment.revealed ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {userCommitment.revealed ? 'Revealed' : 'Unrevealed'}
            </span>
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        
        <div>
          <h3 className="text-sm font-bold text-white truncate">
            {auction.nftName || `NFT #${auction.tokenId}`}
          </h3>
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">
            {auction.nftDescription}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-lg bg-[#0B0D13] border border-[#1E2433] text-xs font-mono">
            <div>
              <span className="text-gray-400 text-[11px] block">
                {isBiddingActive ? 'Reserve' : 'Highest Bid'}
              </span>
              <span className="text-white font-bold">
                {isBiddingActive ? auction.reservePrice : (auction.highestBid !== '0' ? auction.highestBid : 'None')} BOT
              </span>
            </div>

            <div>
              <span className="text-gray-400 text-[11px] block">
                {isBiddingActive ? 'Hidden Bids' : 'Reveals'}
              </span>
              <span className="text-white font-bold">
                {isBiddingActive ? auction.totalCommitments : `${auction.totalReveals}/${auction.totalCommitments}`}
              </span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs font-mono text-gray-400">
            <span>{timeLeft.phaseLabel}:</span>
            <span className="text-white font-semibold">{timeLeft.text}</span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {isBiddingActive && (
            <button
              onClick={() => onBidClick(auction)}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Place Secret Bid</span>
            </button>
          )}

          {isRevealActive && (
            <button
              onClick={() => onRevealClick(auction)}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{userCommitment ? 'Reveal My Bid' : 'Submit Reveal'}</span>
            </button>
          )}

          {isReadyToSettle && (
            <button
              onClick={handleSettle}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
              <span>Settle Auction On-Chain</span>
            </button>
          )}

          {isSettled && (
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400 flex items-center justify-between font-mono">
                <span>Winner: {auction.highestBidder !== '0x0000000000000000000000000000000000000000' ? `${auction.highestBidder.slice(0, 6)}...${auction.highestBidder.slice(-4)}` : 'None'}</span>
                <span className="font-bold">{auction.highestBid} BOT</span>
              </div>

              {userCommitment && userCommitment.bidderAddress.toLowerCase() !== auction.highestBidder.toLowerCase() && (
                <button
                  onClick={handleWithdrawRefund}
                  disabled={isProcessing}
                  className="w-full py-1.5 rounded-lg text-xs font-mono text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  Withdraw Refund On-Chain
                </button>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
