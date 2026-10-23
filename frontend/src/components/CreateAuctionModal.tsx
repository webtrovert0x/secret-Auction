'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles, Loader2, Image as ImageIcon, AlertCircle, Check, Upload, FileText } from 'lucide-react';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther, createPublicClient, http } from 'viem';
import { botChain } from '@/config/chains';
import deployedAddresses from '@/contracts/deployedAddresses.json';
import SecretAuctionFactoryABI from '@/contracts/SecretAuctionFactoryABI.json';
import MockNFTABI from '@/contracts/MockNFTABI.json';

const publicClient = createPublicClient({
  chain: botChain,
  transport: http('https://rpc.botchain.ai'),
});

const ARTWORK_PRESETS = [
  {
    name: 'Cyber Artifact #1',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Quantum Core',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Neural Matrix',
    url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Vortex Protocol',
    url: 'https://images.unsplash.com/photo-1633493752601-525a7a726618?q=80&w=800&auto=format&fit=crop',
  },
];

interface CreateAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAuctionModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAuctionModalProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'mint_and_auction' | 'existing_token'>('mint_and_auction');

  // Mint Form State
  const [nftName, setNftName] = useState('My Cyber NFT');
  const [nftContract, setNftContract] = useState(deployedAddresses.mockNFTAddress);
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'presets' | 'no_image'>('presets');
  const [customImageUrl, setCustomImageUrl] = useState(ARTWORK_PRESETS[0].url);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  
  const [reservePrice, setReservePrice] = useState('1.0');
  const [biddingMins, setBiddingMins] = useState('1440'); // 24 hours
  const [revealMins, setRevealMins] = useState('60'); // 1 hour

  // Existing Token State
  const [tokenId, setTokenId] = useState('');
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);
  const [tokenOwner, setTokenOwner] = useState<string | null>(null);

  // Status & Progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepText, setStepText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setStepText(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit. Please upload a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImageBase64(reader.result as string);
        setImageMode('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  // Check ownership when tokenId changes
  useEffect(() => {
    if (!tokenId || !nftContract || !address) {
      setTokenOwner(null);
      return;
    }

    const checkTokenOwner = async () => {
      try {
        setIsCheckingOwner(true);
        const owner = (await publicClient.readContract({
          address: nftContract as `0x${string}`,
          abi: MockNFTABI,
          functionName: 'ownerOf',
          args: [BigInt(tokenId)],
        })) as string;
        setTokenOwner(owner.toLowerCase());
      } catch (e) {
        setTokenOwner('unminted');
      } finally {
        setIsCheckingOwner(false);
      }
    };

    const timer = setTimeout(checkTokenOwner, 500);
    return () => clearTimeout(timer);
  }, [tokenId, nftContract, address]);

  if (!isOpen) return null;

  const isUserOwner = address && tokenOwner === address.toLowerCase();

  // Determine effective image URI
  let effectiveImageUri = '';
  if (imageMode === 'no_image') {
    effectiveImageUri = 'no-image';
  } else if (imageMode === 'upload' && uploadedImageBase64) {
    effectiveImageUri = uploadedImageBase64;
  } else if (imageMode === 'url' && customImageUrl) {
    effectiveImageUri = customImageUrl;
  } else {
    effectiveImageUri = customImageUrl || ARTWORK_PRESETS[0].url;
  }

  // FLOW 1: Mint NFT and Auction in One Seamless Flow
  const handleMintAndAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isConnected || !address) {
      setErrorMsg('Please connect your wallet first.');
      return;
    }

    try {
      setIsSubmitting(true);
      const factoryAddr = deployedAddresses.factoryAddress as `0x${string}`;

      // 1. Mint NFT to connected user
      setStepText('1/3: Minting NFT to your wallet...');
      const mintTx = await writeContractAsync({
        address: nftContract as `0x${string}`,
        abi: MockNFTABI,
        functionName: 'mint',
        args: [address, effectiveImageUri],
      });

      await publicClient.waitForTransactionReceipt({ hash: mintTx });

      // Query newly minted token ID
      const newSupply = (await publicClient.readContract({
        address: nftContract as `0x${string}`,
        abi: MockNFTABI,
        functionName: 'totalSupply',
      })) as bigint;

      const mintedTokenId = newSupply;

      // 2. Approve Factory
      setStepText(`2/3: Approving Factory for Token #${mintedTokenId}...`);
      const approveTx = await writeContractAsync({
        address: nftContract as `0x${string}`,
        abi: MockNFTABI,
        functionName: 'approve',
        args: [factoryAddr, mintedTokenId],
      });

      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // 3. Create Secret Auction
      setStepText('3/3: Deploying Secret Auction contract...');
      const bDurationSec = BigInt(parseInt(biddingMins) * 60);
      const rDurationSec = BigInt(parseInt(revealMins) * 60);

      const createTx = await writeContractAsync({
        address: factoryAddr,
        abi: SecretAuctionFactoryABI,
        functionName: 'createAuction',
        args: [
          nftContract as `0x${string}`,
          mintedTokenId,
          parseEther(reservePrice),
          bDurationSec,
          rDurationSec,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash: createTx });

      setIsSubmitting(false);
      setStepText(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Mint and auction error:', err);
      setErrorMsg(err?.shortMessage || err?.message || 'Transaction failed on BOT Chain.');
      setIsSubmitting(false);
      setStepText(null);
    }
  };

  // FLOW 2: Auction an Existing Token ID the User Already Owns
  const handleAuctionExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isConnected || !address) {
      setErrorMsg('Please connect your wallet.');
      return;
    }

    if (!isUserOwner) {
      setErrorMsg(`You do not own Token #${tokenId}. Please switch to "Mint & Auction" or enter a token you own.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const factoryAddr = deployedAddresses.factoryAddress as `0x${string}`;

      // 1. Approve
      setStepText(`1/2: Approving Factory for Token #${tokenId}...`);
      const approveTx = await writeContractAsync({
        address: nftContract as `0x${string}`,
        abi: MockNFTABI,
        functionName: 'approve',
        args: [factoryAddr, BigInt(tokenId)],
      });

      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // 2. Create Auction
      setStepText('2/2: Deploying Secret Auction contract...');
      const bDurationSec = BigInt(parseInt(biddingMins) * 60);
      const rDurationSec = BigInt(parseInt(revealMins) * 60);

      const createTx = await writeContractAsync({
        address: factoryAddr,
        abi: SecretAuctionFactoryABI,
        functionName: 'createAuction',
        args: [
          nftContract as `0x${string}`,
          BigInt(tokenId),
          parseEther(reservePrice),
          bDurationSec,
          rDurationSec,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash: createTx });

      setIsSubmitting(false);
      setStepText(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Auction existing error:', err);
      setErrorMsg(err?.shortMessage || err?.message || 'Transaction failed on BOT Chain.');
      setIsSubmitting(false);
      setStepText(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#131722] border border-[#1E2433] p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="mb-4">
          <div className="text-xs font-mono uppercase text-blue-400 font-bold tracking-wider mb-1">
            BOT CHAIN FACTORY
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            DEPLOY SECRET AUCTION
          </h2>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#0B0D13] border border-[#1E2433] mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('mint_and_auction')}
            className={`py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'mint_and_auction'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mint & Launch Auction</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('existing_token')}
            className={`py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'existing_token'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Auction Existing Token</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* TAB 1: MINT & AUCTION */}
        {activeTab === 'mint_and_auction' && (
          <form onSubmit={handleMintAndAuction} className="space-y-4">
            
            {/* NFT Name */}
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
                NFT Name
              </label>
              <input
                type="text"
                required
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-blue-500 text-white font-mono text-xs outline-none"
                placeholder="e.g. Cyber Vanguard #100"
              />
            </div>

            {/* Artwork / Image Options */}
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-2">
                NFT Artwork Choice
              </label>

              {/* 4 Image Modes: Upload File, Paste URL, Pick Preset, No Image */}
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg bg-[#0B0D13] border border-[#1E2433] mb-3 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`py-1.5 rounded transition-colors flex items-center justify-center gap-1 ${
                    imageMode === 'upload' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`py-1.5 rounded transition-colors flex items-center justify-center gap-1 ${
                    imageMode === 'url' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" /> URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('presets')}
                  className={`py-1.5 rounded transition-colors flex items-center justify-center gap-1 ${
                    imageMode === 'presets' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3" /> Presets
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('no_image')}
                  className={`py-1.5 rounded transition-colors flex items-center justify-center gap-1 ${
                    imageMode === 'no_image' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3" /> No Image
                </button>
              </div>

              {/* Mode 1: File Upload */}
              {imageMode === 'upload' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border border-dashed border-[#232A3B] hover:border-blue-500 rounded-xl p-5 text-center bg-[#0B0D13] flex flex-col items-center justify-center gap-2"
                  >
                    {uploadedImageBase64 ? (
                      <div className="flex items-center gap-3">
                        <img src={uploadedImageBase64} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                        <span className="text-xs text-emerald-400 font-mono">Image loaded! Click to change.</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-blue-400" />
                        <span className="text-xs text-gray-300 font-mono">Click to select image file from your device</span>
                        <span className="text-[10px] text-gray-500 font-mono">PNG, JPG, GIF, WEBP up to 2MB</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Custom URL */}
              {imageMode === 'url' && (
                <input
                  type="url"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-blue-500 text-white font-mono text-xs outline-none"
                  placeholder="Paste image link: https://..."
                />
              )}

              {/* Mode 3: Presets */}
              {imageMode === 'presets' && (
                <div className="grid grid-cols-4 gap-2">
                  {ARTWORK_PRESETS.map((art, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCustomImageUrl(art.url)}
                      className={`cursor-pointer rounded-lg overflow-hidden border transition-all ${
                        customImageUrl === art.url
                          ? 'border-blue-500 ring-1 ring-blue-500'
                          : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={art.url} alt={art.name} className="w-full aspect-square object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Mode 4: No Image Note */}
              {imageMode === 'no_image' && (
                <div className="p-3.5 rounded-xl bg-[#0B0D13] border border-[#1E2433] text-xs text-gray-400 flex items-center gap-2 font-mono">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Generic NFT with metadata only (no image artwork will be attached).</span>
                </div>
              )}
            </div>

            {/* Reserve Price */}
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
                Reserve Starting Price (BOT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  value={reservePrice}
                  onChange={(e) => setReservePrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-blue-500 text-white font-mono text-sm outline-none pr-16"
                  placeholder="1.0"
                />
                <span className="absolute right-4 top-2.5 text-xs font-mono font-bold text-gray-400">
                  BOT
                </span>
              </div>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
                  Bidding Window
                </label>
                <select
                  value={biddingMins}
                  onChange={(e) => setBiddingMins(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] text-white font-mono text-xs outline-none"
                >
                  <option value="5">5 Minutes (Fast Test)</option>
                  <option value="60">1 Hour</option>
                  <option value="1440">24 Hours (Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
                  Reveal Window
                </label>
                <select
                  value={revealMins}
                  onChange={(e) => setRevealMins(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] text-white font-mono text-xs outline-none"
                >
                  <option value="2">2 Minutes (Fast Test)</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{isSubmitting ? (stepText || 'PROCESSING ON-CHAIN...') : 'MINT NFT & DEPLOY SECRET AUCTION'}</span>
            </button>

          </form>
        )}

        {/* TAB 2: AUCTION EXISTING TOKEN */}
        {activeTab === 'existing_token' && (
          <form onSubmit={handleAuctionExisting} className="space-y-4">
            
            {/* NFT Contract */}
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
                NFT Contract Address
              </label>
              <input
                type="text"
                required
                value={nftContract}
                onChange={(e) => setNftContract(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-blue-500 text-white font-mono text-xs outline-none"
                placeholder="0x..."
              />
            </div>

            {/* Token ID + Ownership Check */}
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
                NFT Token ID
              </label>
              <input
                type="number"
                required
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-blue-500 text-white font-mono text-sm outline-none"
                placeholder="e.g. 2"
              />

              {/* Ownership Feedback */}
              {tokenId && (
                <div className="mt-2 text-xs font-mono">
                  {isCheckingOwner ? (
                    <span className="text-gray-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking owner...
                    </span>
                  ) : isUserOwner ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> You own Token #{tokenId} (Ready to auction)
                    </span>
                  ) : tokenOwner === 'unminted' ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Token #{tokenId} is not minted yet.
                    </span>
                  ) : tokenOwner ? (
                    <span className="text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Token #{tokenId} belongs to {tokenOwner.slice(0, 6)}...{tokenOwner.slice(-4)}. You must own it to auction.
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Reserve Price */}
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
                Reserve Starting Price (BOT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  value={reservePrice}
                  onChange={(e) => setReservePrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] focus:border-blue-500 text-white font-mono text-sm outline-none pr-16"
                  placeholder="1.0"
                />
                <span className="absolute right-4 top-2.5 text-xs font-mono font-bold text-gray-400">
                  BOT
                </span>
              </div>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
                  Bidding Window
                </label>
                <select
                  value={biddingMins}
                  onChange={(e) => setBiddingMins(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] text-white font-mono text-xs outline-none"
                >
                  <option value="5">5 Minutes</option>
                  <option value="60">1 Hour</option>
                  <option value="1440">24 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 uppercase mb-1.5">
                  Reveal Window
                </label>
                <select
                  value={revealMins}
                  onChange={(e) => setRevealMins(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D13] border border-[#232A3B] text-white font-mono text-xs outline-none"
                >
                  <option value="2">2 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !isUserOwner}
              className="w-full mt-3 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{isSubmitting ? (stepText || 'DEPLOYING ON-CHAIN...') : 'APPROVE & DEPLOY AUCTION'}</span>
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
