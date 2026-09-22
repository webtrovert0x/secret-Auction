'use client';

import React, { useState, useEffect } from 'react';
import { X, Unlock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuctionData } from '@/lib/types';
import { getCommitmentForAuction, markCommitmentRevealed } from '@/lib/storage';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther, createPublicClient, http } from 'viem';
import { botChain } from '@/config/chains';
import SecretAuctionABI from '@/contracts/SecretAuctionABI.json';

const publicClient = createPublicClient({
  chain: botChain,
  transport: http('https://rpc.bohr.life'),
});

interface RevealModalProps {
  auction: AuctionData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RevealModal({
  auction,
  isOpen,
  onClose,
  onSuccess,
}: RevealModalProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [bidAmount, setBidAmount] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && auction) {
      const stored = getCommitmentForAuction(auction.address, address);
      if (stored) {
        setBidAmount(stored.bidAmount);
        setSecret(stored.secret);
      } else {
        setBidAmount('');
        setSecret('');
      }
      setErrorMsg(null);
      setStatusText(null);
    }
  }, [isOpen, auction, address]);

  if (!isOpen || !auction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidAmount || !secret) return;
    setErrorMsg(null);

    if (!isConnected || !address) {
      setErrorMsg('Please connect your wallet.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusText('1/2: Submitting reveal transaction...');

      // Call on-chain revealBid(uint256 amount, string secret)
      const txHash = await writeContractAsync({
        address: auction.address as `0x${string}`,
        abi: SecretAuctionABI,
        functionName: 'revealBid',
        args: [parseEther(bidAmount), secret],
      });

      setStatusText('2/2: Waiting for on-chain block confirmation...');
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      markCommitmentRevealed(auction.address, address);

      setIsSubmitting(false);
      setStatusText(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Reveal bid error:', err);
      setErrorMsg(err?.shortMessage || err?.message || 'Reveal failed on-chain. Verify your secret salt and bid amount.');
      setIsSubmitting(false);
      setStatusText(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-[#131722] border border-[#1E2433] p-6 sm:p-8 shadow-2xl">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="mb-6">
          <div className="text-xs font-mono uppercase text-purple-400 font-bold tracking-wider mb-1 flex items-center gap-1.5">
            <Unlock className="w-3.5 h-3.5" /> REVEAL PHASE
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            REVEAL SECRET BID ON-CHAIN
          </h2>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
              Your Sealed Bid Amount
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-purple-500 text-white font-mono text-base outline-none pr-16"
                placeholder="e.g. 750"
              />
              <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-gray-400">
                BOT
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
              Secret Salt Passphrase
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                required
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-purple-500 text-white font-mono text-base outline-none pr-12"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-white"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !bidAmount || !secret}
            className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            <span>{isSubmitting ? (statusText || 'REVEALING ON-CHAIN...') : 'REVEAL BID TO CONTRACT'}</span>
          </button>

        </form>

      </div>
    </div>
  );
}
