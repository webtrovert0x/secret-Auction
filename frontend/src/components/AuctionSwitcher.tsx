'use client';

import React from 'react';
import { Lock, Unlock, Trophy } from 'lucide-react';
import { AuctionData, AuctionPhase } from '@/lib/types';

interface AuctionSwitcherProps {
  auctions: AuctionData[];
  selectedAuction: AuctionData;
  onSelect: (auction: AuctionData) => void;
}

export function AuctionSwitcher({
  auctions,
  selectedAuction,
  onSelect,
}: AuctionSwitcherProps) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 font-mono">
          All Secret Auctions ({auctions.length})
        </h3>
        <span className="text-xs text-gray-400 font-mono">Select to inspect</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {auctions.map((auction) => {
          const isSelected = auction.address === selectedAuction.address;
          const isBidding = auction.state === AuctionPhase.BIDDING;
          const isReveal = auction.state === AuctionPhase.REVEALING;
          const isSettled = auction.state === AuctionPhase.SETTLED;

          return (
            <div
              key={auction.address}
              onClick={() => onSelect(auction)}
              className={`cursor-pointer rounded-xl p-4 border transition-all flex items-center gap-4 ${
                isSelected
                  ? 'bg-[#151C2C] border-cyan-400 ring-1 ring-cyan-400'
                  : 'bg-[#111622] border-white/5 hover:border-white/20'
              }`}
            >
              <img
                src={auction.nftImage}
                alt={auction.nftName}
                className="w-12 h-12 rounded-lg object-cover bg-black shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white truncate">
                    NFT #{auction.tokenId}
                  </span>
                  {isBidding && <span className="text-[10px] text-cyan-400 font-mono font-bold">🔒 Bidding</span>}
                  {isReveal && <span className="text-[10px] text-purple-400 font-mono font-bold">🔓 Reveal</span>}
                  {isSettled && <span className="text-[10px] text-emerald-400 font-mono font-bold">🏆 Settled</span>}
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  Reserve: <span className="text-gray-300">{auction.reservePrice} BOT</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
