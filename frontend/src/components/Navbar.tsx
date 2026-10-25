'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Key, Plus, RefreshCw } from 'lucide-react';
import { getStoredCommitments } from '@/lib/storage';

interface NavbarProps {
  onCreateClick: () => void;
  onVaultClick: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function Navbar({ onCreateClick, onVaultClick, onRefresh, isRefreshing }: NavbarProps) {
  const [vaultCount, setVaultCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const stored = getStoredCommitments();
      setVaultCount(stored.length);
    };
    updateCount();
    window.addEventListener('storage', updateCount);
    const interval = setInterval(updateCount, 2000);
    return () => {
      window.removeEventListener('storage', updateCount);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0E121B]/95 backdrop-blur border-b border-[#1E2433]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-emerald-500/30 flex items-center justify-center bg-black shrink-0 shadow-sm shadow-emerald-500/20">
            <img src="/logo.jpg" alt="BOT Secret Auction Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white tracking-tight">
              BOT Secret Auction
            </span>
            <span className="hidden sm:inline-flex text-[11px] font-mono text-gray-400 items-center gap-1.5 pl-2 border-l border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              BOT Chain Mainnet (677)
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          
          <button
            onClick={onRefresh}
            title="Refresh on-chain data"
            className="p-2 rounded-lg text-gray-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onVaultClick}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-gray-400" />
            <span>My Secrets</span>
            {vaultCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                {vaultCount}
              </span>
            )}
          </button>

          <button
            onClick={onCreateClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deploy Auction</span>
          </button>

          <div className="flex items-center pl-1">
            <appkit-button size="sm" />
          </div>

        </div>

      </div>
    </header>
  );
}
