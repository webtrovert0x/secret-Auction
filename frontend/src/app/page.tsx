'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { AuctionCard } from '@/components/AuctionCard';
import { SecretBidModal } from '@/components/SecretBidModal';
import { RevealModal } from '@/components/RevealModal';
import { CreateAuctionModal } from '@/components/CreateAuctionModal';
import { VaultDrawer } from '@/components/VaultDrawer';
import { useOnChainAuctions } from '@/hooks/useOnChainAuctions';
import { AuctionData, AuctionPhase } from '@/lib/types';
import { Lock, Unlock, Trophy, Search, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import deployedAddresses from '@/contracts/deployedAddresses.json';

export default function Home() {
  const { auctions, isLoading, error, refetch } = useOnChainAuctions();
  const [activeTab, setActiveTab] = useState<'all' | 'bidding' | 'reveal' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedBidAuction, setSelectedBidAuction] = useState<AuctionData | null>(null);
  const [selectedRevealAuction, setSelectedRevealAuction] = useState<AuctionData | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBidClick = (auction: AuctionData) => {
    setSelectedBidAuction(auction);
  };

  const handleRevealClick = (auction: AuctionData) => {
    setSelectedRevealAuction(auction);
  };

  const handleActionSuccess = (msg: string) => {
    showToast(msg);
    refetch();
  };

  const filteredAuctions = auctions.filter((a) => {
    const matchesSearch =
      (a.nftName && a.nftName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.tokenId.toString().includes(searchQuery) ||
      a.address.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'bidding') return a.state === AuctionPhase.BIDDING;
    if (activeTab === 'reveal') return a.state === AuctionPhase.REVEALING;
    if (activeTab === 'settled') return a.state === AuctionPhase.SETTLED;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0B0D13] text-gray-100 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-[#131722] border border-[#232A3B] text-white text-xs font-mono shadow-xl animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Clean Navbar */}
      <Navbar
        onCreateClick={() => setIsCreateOpen(true)}
        onVaultClick={() => setIsVaultOpen(true)}
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      {/* Hero Section */}
      <HeroSection />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* On-Chain Status Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#131722] border border-[#1E2433]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All On-Chain ({auctions.length})
            </button>

            <button
              onClick={() => setActiveTab('bidding')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'bidding'
                  ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Bidding</span>
            </button>

            <button
              onClick={() => setActiveTab('reveal')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'reveal'
                  ? 'bg-purple-600/20 text-purple-400 font-semibold border border-purple-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Unlock className="w-3 h-3" />
              <span>Reveal Phase</span>
            </button>

            <button
              onClick={() => setActiveTab('settled')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'settled'
                  ? 'bg-emerald-600/20 text-emerald-400 font-semibold border border-emerald-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3 h-3" />
              <span>Settled</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Token ID or Contract..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#131722] border border-[#1E2433] text-xs text-white placeholder-gray-500 focus:border-blue-500 outline-none"
            />
          </div>

        </div>

        {/* Loading State */}
        {isLoading && auctions.length === 0 ? (
          <div className="py-20 text-center rounded-xl bg-[#131722] border border-[#1E2433] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <p className="text-xs text-gray-400 font-mono">Reading live contracts from BOT Chain RPC...</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="py-16 text-center rounded-xl bg-[#131722] border border-[#1E2433] space-y-2">
            <p className="text-xs text-gray-300">No auctions found on BOT Chain matching this filter.</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500"
            >
              Deploy First Auction
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAuctions.map((auction) => (
              <AuctionCard
                key={auction.address}
                auction={auction}
                onBidClick={handleBidClick}
                onRevealClick={handleRevealClick}
                onSuccess={() => handleActionSuccess('Transaction confirmed on BOT Chain!')}
              />
            ))}
          </div>
        )}

      </main>

      {/* Ecosystem Showcase Footer */}
      <footer className="w-full py-8 border-t border-[#1E2433] bg-[#0E121B] text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* BOT Chain Ecosystem Info */}
          <div className="flex items-center gap-3">
            <img
              src="/botchain.jpeg"
              alt="BOT Chain Logo"
              className="w-9 h-9 rounded-full border border-emerald-500/30 shadow-md shrink-0 object-cover"
            />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>BOT Chain Ecosystem</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                  Mainnet 677
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Native sealed-bid cryptographic auctions for BOT Chain digital assets.
              </p>
            </div>
          </div>

          {/* Links with BOT Chain Logo at the front */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://botchain.ai"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium flex items-center gap-2 transition-colors hover:border-emerald-500/50"
            >
              <img src="/botchain.jpeg" alt="BOT" className="w-4 h-4 rounded-full object-cover" />
              <span>BOT Chain Website</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </a>

            <a
              href="https://scan.botchain.ai"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium flex items-center gap-2 transition-colors hover:border-emerald-500/50"
            >
              <img src="/botchain.jpeg" alt="BOT" className="w-4 h-4 rounded-full object-cover" />
              <span>BOT Chain Explorer</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </a>

            <a
              href={`https://scan.botchain.ai/address/${deployedAddresses.factoryAddress}#code`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-400 font-mono text-[11px] flex items-center gap-1.5 transition-colors hover:bg-emerald-500/10"
            >
              <span>Verified Factory: {deployedAddresses.factoryAddress.slice(0, 6)}...{deployedAddresses.factoryAddress.slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>
      </footer>

      {/* Modals */}
      <SecretBidModal
        auction={selectedBidAuction}
        isOpen={!!selectedBidAuction}
        onClose={() => setSelectedBidAuction(null)}
        onSuccess={() => handleActionSuccess('Secret bid committed on-chain!')}
      />

      <RevealModal
        auction={selectedRevealAuction}
        isOpen={!!selectedRevealAuction}
        onClose={() => setSelectedRevealAuction(null)}
        onSuccess={() => handleActionSuccess('Secret bid revealed on-chain!')}
      />

      <CreateAuctionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => handleActionSuccess('Secret Auction deployed to BOT Chain!')}
      />

      <VaultDrawer
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        onSelectReveal={(addr) => {
          const match = auctions.find((a) => a.address.toLowerCase() === addr.toLowerCase());
          if (match) setSelectedRevealAuction(match);
        }}
      />

    </div>
  );
}
