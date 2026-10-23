'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuctionData } from '@/lib/types';
import { computeCommitment, generateRandomSecret } from '@/lib/hash';
import { saveCommitment } from '@/lib/storage';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther, createPublicClient, http } from 'viem';
import { botChain } from '@/config/chains';
import SecretAuctionABI from '@/contracts/SecretAuctionABI.json';

const publicClient = createPublicClient({
  chain: botChain,
  transport: http('https://rpc.botchain.ai'),
});

interface SecretBidModalProps {
  auction: AuctionData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SecretBidModal({
  auction,
  isOpen,
  onClose,
  onSuccess,
}: SecretBidModalProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [bidAmount, setBidAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveAddress = address || '0x0000000000000000000000000000000000000000';

  useEffect(() => {
    if (isOpen && auction) {
      if (!secret) setSecret(generateRandomSecret());
      if (!bidAmount) {
        setBidAmount(auction.reservePrice);
        setDepositAmount(auction.reservePrice);
      }
      setErrorMsg(null);
      setStatusText(null);
    }
  }, [isOpen, auction]);

  const handleBidChange = (val: string) => {
    setBidAmount(val);
    if (!depositAmount || parseFloat(depositAmount) < parseFloat(val || '0')) {
      setDepositAmount(val);
    }
  };

  const { hash } = computeCommitment(bidAmount, secret, effectiveAddress);

  if (!isOpen || !auction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidAmount || !secret) return;
    setErrorMsg(null);

    if (!isConnected || !address) {
      setErrorMsg('Please connect your wallet first.');
      return;
    }

    if (parseFloat(bidAmount) < parseFloat(auction.reservePrice)) {
      setErrorMsg(`Bid must be at least the reserve price of ${auction.reservePrice} BOT.`);
      return;
    }

    if (parseFloat(depositAmount) < parseFloat(bidAmount)) {
      setErrorMsg('Deposit must be greater than or equal to your bid amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusText('1/2: Submitting commit transaction to wallet...');

      // 1. Send on-chain transaction: commitBid(bytes32 commitmentHash) with msg.value = deposit
      const txHash = await writeContractAsync({
        address: auction.address as `0x${string}`,
        abi: SecretAuctionABI,
        functionName: 'commitBid',
        args: [hash],
        value: parseEther(depositAmount),
      });

      setStatusText('2/2: Waiting for BOT Chain block confirmation...');
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // 2. Save commitment salt locally for reveal phase
      saveCommitment({
        auctionAddress: auction.address,
        bidderAddress: address,
        tokenId: auction.tokenId,
        bidAmount,
        depositAmount,
        secret,
        commitmentHash: hash,
        timestamp: Date.now(),
        revealed: false,
      });

      setIsSubmitting(false);
      setStatusText(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Commit bid error:', err);
      setErrorMsg(err?.shortMessage || err?.message || 'Transaction failed on BOT Chain.');
      setIsSubmitting(false);
      setStatusText(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-[#131722] border border-[#1E2433] p-6 sm:p-8 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="mb-6">
          <div className="text-xs font-mono uppercase text-blue-400 font-bold tracking-wider mb-1">
            SECRET AUCTION #{auction.tokenId}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            PLACE ON-CHAIN SECRET BID
          </h2>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Bid Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-gray-300 uppercase">
                Secret Bid Amount
              </label>
              <span className="text-[11px] font-mono text-emerald-400">
                Reserve: {auction.reservePrice} BOT
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={bidAmount}
                onChange={(e) => handleBidChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-blue-500 text-white font-mono text-base outline-none pr-16"
                placeholder={`Min ${auction.reservePrice}`}
              />
              <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-gray-400">
                BOT
              </span>
            </div>
            {bidAmount && parseFloat(bidAmount) < parseFloat(auction.reservePrice) && (
              <p className="text-[11px] font-mono text-yellow-400 mt-1">
                ⚠️ Bid must be at least the reserve price ({auction.reservePrice} BOT).
              </p>
            )}
          </div>

          {/* Deposit Amount (Over-deposit masking) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-gray-300 uppercase">
                Deposit to Lock (BOT)
              </label>
              <span className="text-[11px] text-gray-400">Masks true bid on-chain</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-blue-500 text-white font-mono text-base outline-none pr-16"
                placeholder={bidAmount || auction.reservePrice}
              />
              <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-gray-400">
                BOT
              </span>
            </div>
          </div>

          {/* Secret Phrase */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-gray-300 uppercase">
                Secret Salt Passphrase
              </label>
              <button
                type="button"
                onClick={() => setSecret(generateRandomSecret())}
                className="text-[11px] font-mono text-blue-400 hover:underline"
              >
                Randomize
              </button>
            </div>
            
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                required
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-blue-500 text-white font-mono text-base outline-none pr-12"
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

          {/* Commitment Display */}
          <div className="p-3.5 rounded-xl bg-[#0B0D13] border border-[#1E2433] space-y-1">
            <span className="text-[10px] font-mono uppercase text-gray-400 block">
              Calculated Keccak256 Commitment
            </span>
            <code className="text-xs font-mono text-blue-400 truncate block">
              {hash}
            </code>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !bidAmount || !secret}
            className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>{isSubmitting ? (statusText || 'CONFIRMING ON-CHAIN...') : 'LOCK SECRET BID ON-CHAIN'}</span>
          </button>

        </form>

      </div>
    </div>
  );
}
