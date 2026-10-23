'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Trophy, Shield, Key, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';
import { AuctionData, AuctionPhase } from '@/lib/types';
import { getCommitmentForAuction } from '@/lib/storage';
import { useAccount } from 'wagmi';

interface FeaturedAuctionProps {
  auction: AuctionData;
  onBidClick: () => void;
  onRevealClick: () => void;
  onSettleClick: () => void;
}

export function FeaturedAuction({
  auction,
  onBidClick,
  onRevealClick,
  onSettleClick,
}: FeaturedAuctionProps) {
  const { address } = useAccount();
  const [timeLeft, setTimeLeft] = useState({
    timeStr: '00:00:00',
    phaseLabel: 'Bidding Window',
    isReveal: false,
    isEnded: false,
  });
  const [userCommitment, setUserCommitment] = useState<any>(null);

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
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);

      if (auction.state === AuctionPhase.SETTLED || now >= auction.revealEndTime) {
        setTimeLeft({
          timeStr: 'SETTLED',
          phaseLabel: 'Auction Complete',
          isReveal: false,
          isEnded: true,
        });
        return;
      }

      if (now < auction.biddingEndTime) {
        const diff = Math.max(0, auction.biddingEndTime - now);
        const hours = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        setTimeLeft({
          timeStr: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
          phaseLabel: 'BIDDING CLOSES IN',
          isReveal: false,
          isEnded: false,
        });
      } else {
        const diff = Math.max(0, auction.revealEndTime - now);
        const hours = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        setTimeLeft({
          timeStr: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
          phaseLabel: 'REVEAL PHASE CLOSES IN',
          isReveal: true,
          isEnded: false,
        });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [auction.biddingEndTime, auction.revealEndTime, auction.state]);

  const isBiddingActive = !timeLeft.isReveal && !timeLeft.isEnded;
  const isRevealActive = timeLeft.isReveal && !timeLeft.isEnded;
  const isSettled = auction.state === AuctionPhase.SETTLED || timeLeft.isEnded;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#111622] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
        
        {/* Left: NFT Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner group">
            <img
              src={auction.nftImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800'}
              alt={auction.nftName || `NFT #${auction.tokenId}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-xs font-mono font-bold text-white border border-white/10">
              Token #{auction.tokenId}
            </div>

            {userCommitment && (
              <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-lg bg-[#0B0E14]/95 backdrop-blur-md border border-cyan-500/40 text-xs flex items-center justify-between">
                <span className="text-gray-300 font-mono">Your Bid: <strong className="text-white">{userCommitment.bidAmount} BOT</strong></span>
                <span className={`text-[10px] font-bold uppercase ${userCommitment.revealed ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {userCommitment.revealed ? 'Revealed' : 'Unrevealed'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Clean Auction Focus Box */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-6">
          
          <div>
            {/* Header / Subtitle */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                SECRET AUCTION
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-xs font-mono text-gray-400">
                BOT Chain Mainnet
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {auction.nftName || `NFT #${auction.tokenId}`}
            </h1>

            <p className="text-xs text-gray-400 mt-2 line-clamp-2">
              {auction.nftDescription || 'Sealed-bid auction where bids remain cryptographically hidden until the reveal window.'}
            </p>
          </div>

          {/* Central Countdown & State Panel */}
          <div className="p-5 rounded-xl bg-[#0B0E14] border border-white/5 space-y-4">
            
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono border-b border-white/5 pb-3">
              <span>{timeLeft.phaseLabel}</span>
              <span className="text-gray-400">Reserve: <strong className="text-white">{auction.reservePrice} BOT</strong></span>
            </div>

            {/* Main Clock */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isBiddingActive && <Lock className="w-6 h-6 text-cyan-400 animate-pulse" />}
                {isRevealActive && <Unlock className="w-6 h-6 text-purple-400 animate-bounce" />}
                {isSettled && <Trophy className="w-6 h-6 text-emerald-400" />}
                
                <span className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight">
                  {timeLeft.timeStr}
                </span>
              </div>

              {/* Bids Counter */}
              <div className="text-right font-mono">
                <div className="text-lg font-bold text-white">
                  {isBiddingActive ? `${auction.totalCommitments}` : `${auction.totalReveals}/${auction.totalCommitments}`}
                </div>
                <div className="text-[11px] text-gray-400">
                  {isBiddingActive ? 'hidden bids' : 'revealed'}
                </div>
              </div>
            </div>

            {/* Revealed status banner if in Reveal or Settled */}
            {auction.highestBid !== '0' && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">{isSettled ? 'Winning Bid:' : 'Highest Revealed:'}</span>
                <span className="text-cyan-400 font-bold">{auction.highestBid} BOT</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {isBiddingActive && (
              <button
                onClick={onBidClick}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-black bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>PLACE SECRET BID</span>
              </button>
            )}

            {isRevealActive && (
              <button
                onClick={onRevealClick}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>{userCommitment ? 'REVEAL MY BID' : 'SUBMIT REVEAL'}</span>
              </button>
            )}

            {isSettled && (
              <button
                onClick={onSettleClick}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-black bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>SETTLE AUCTION</span>
              </button>
            )}

            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-1">
              <span>Contract: {auction.address.slice(0, 8)}...{auction.address.slice(-6)}</span>
              <a
                href={`https://scan.botchain.ai/address/${auction.address}`}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
