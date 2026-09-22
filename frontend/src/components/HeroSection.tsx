'use client';

import React, { useState } from 'react';
import { Lock, EyeOff, KeyRound, Trophy, ShieldCheck, Copy, Check, Sparkles } from 'lucide-react';
import { computeCommitment, generateRandomSecret } from '@/lib/hash';

export function HeroSection() {
  const [demoAmount, setDemoAmount] = useState('500');
  const [demoSecret, setDemoSecret] = useState('banana123');
  const [copied, setCopied] = useState(false);

  const demoAddress = '0xD95368B45cca7C275B101DA4c54e67f0f5248063';
  const { hash } = computeCommitment(demoAmount, demoSecret, demoAddress);

  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 border-b border-[#1E2433] bg-[#0E121B]">
      <div className="max-w-7xl mx-auto">
        
        {/* Title */}
        <div className="max-w-3xl mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Sealed-Bid Commit-Reveal Protocol on BOT Chain
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Fair Cryptographic Secret Auctions
          </h1>

          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            Unlike public auctions where bids are exposed and manipulated, all bids on BOT Secret Auction remain sealed commitments until the reveal window closes.
          </p>
        </div>

        {/* 4 Clean Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
          
          <div className="p-4 rounded-xl bg-[#131722] border border-[#1E2433]">
            <div className="text-xs font-mono font-bold text-blue-400 mb-1">01. Lock NFT</div>
            <h2 className="text-sm font-semibold text-white mb-1">Seller Creates Auction</h2>
            <p className="text-xs text-gray-400">Seller locks NFT with reserve price and phase durations.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#131722] border border-[#1E2433]">
            <div className="text-xs font-mono font-bold text-blue-400 mb-1">02. Commit Bid</div>
            <h2 className="text-sm font-semibold text-white mb-1">Sealed Commitment</h2>
            <p className="text-xs text-gray-400">Submit <code className="text-gray-300">hash(Bid + Secret)</code> + deposit. Bid stays 100% hidden.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#131722] border border-[#1E2433]">
            <div className="text-xs font-mono font-bold text-blue-400 mb-1">03. Reveal Phase</div>
            <h2 className="text-sm font-semibold text-white mb-1">Verify Secret</h2>
            <p className="text-xs text-gray-400">Submit your secret phrase to verify and validate your bid.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#131722] border border-[#1E2433]">
            <div className="text-xs font-mono font-bold text-emerald-400 mb-1">04. Settle</div>
            <h2 className="text-sm font-semibold text-white mb-1">Claim NFT & Refunds</h2>
            <p className="text-xs text-gray-400">Highest revealed bid wins the NFT; losing deposits are refunded.</p>
          </div>

        </div>

        {/* Clean Hasher Engine */}
        <div className="p-5 rounded-xl bg-[#131722] border border-[#1E2433]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Interactive Keccak256 Commitment Calculator
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Calculates <code className="text-gray-300">keccak256(amount, secret, bidder)</code> in real-time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="number"
                  value={demoAmount}
                  onChange={(e) => setDemoAmount(e.target.value)}
                  className="w-32 px-3 py-1.5 rounded-lg bg-[#0B0D13] border border-[#232A3B] text-white font-mono text-xs outline-none focus:border-blue-500"
                  placeholder="Amount"
                />
                <span className="absolute right-2.5 top-1.5 text-[10px] text-gray-400 font-mono">BOT</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={demoSecret}
                  onChange={(e) => setDemoSecret(e.target.value)}
                  className="w-36 px-3 py-1.5 rounded-lg bg-[#0B0D13] border border-[#232A3B] text-white font-mono text-xs outline-none focus:border-blue-500"
                  placeholder="Secret salt"
                />
              </div>

              <button
                onClick={() => setDemoSecret(generateRandomSecret())}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-gray-300"
              >
                Randomize
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B0D13] border border-[#1E2433] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-mono text-gray-400 block">Commitment Hash (Sent to Smart Contract)</span>
              <code className="text-xs font-mono text-blue-400 truncate block">{hash}</code>
            </div>

            <button
              onClick={copyHash}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 flex items-center gap-1 shrink-0"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
