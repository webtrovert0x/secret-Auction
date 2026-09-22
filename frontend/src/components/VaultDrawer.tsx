'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Copy, Check, Trash2, Unlock } from 'lucide-react';
import { StoredCommitment } from '@/lib/types';
import { getStoredCommitments } from '@/lib/storage';

interface VaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReveal: (auctionAddress: string) => void;
}

export function VaultDrawer({ isOpen, onClose, onSelectReveal }: VaultDrawerProps) {
  const [commitments, setCommitments] = useState<StoredCommitment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCommitments(getStoredCommitments());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear your local secret vault?')) {
      localStorage.removeItem('BOT_SECRET_AUCTION_VAULT_V1');
      setCommitments([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#131722] border-l border-[#1E2433] p-6 flex flex-col justify-between shadow-2xl">
          
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2433]">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">My Secret Vault</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 overflow-y-auto max-h-[70vh] pr-1">
              {commitments.length === 0 ? (
                <div className="text-center py-10 rounded-lg bg-[#0B0D13] border border-[#1E2433] text-xs text-gray-400">
                  No secret bids saved in this browser yet.
                </div>
              ) : (
                commitments.map((c, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-[#0B0D13] border border-[#1E2433] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">NFT #{c.tokenId}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${c.revealed ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-950/40 text-yellow-400 border border-yellow-500/20'}`}>
                        {c.revealed ? 'Revealed' : 'Pending Reveal'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                      <span>Bid: <strong className="text-white">{c.bidAmount} BOT</strong></span>
                      <span>Deposit: {c.depositAmount} BOT</span>
                    </div>

                    <div className="p-2 rounded bg-[#131722] border border-[#1E2433] flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400 truncate">Secret: <strong className="text-blue-400">"{c.secret}"</strong></span>
                      <button
                        onClick={() => handleCopy(c.secret, `secret-${idx}`)}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        {copiedId === `secret-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {!c.revealed && (
                      <button
                        onClick={() => {
                          onSelectReveal(c.auctionAddress);
                          onClose();
                        }}
                        className="w-full py-1.5 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium border border-purple-500/30 flex items-center justify-center gap-1"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>Go to Reveal</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {commitments.length > 0 && (
            <button
              onClick={handleClearAll}
              className="w-full py-2 rounded bg-white/5 hover:bg-red-950/30 text-gray-400 hover:text-red-400 border border-white/5 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local Vault</span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
