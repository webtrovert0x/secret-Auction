import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '@/context/Web3Provider';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'BOT Secret Auction — Sealed-Bid NFT Marketplace on BOT Chain',
  description: 'Cryptographic commit-reveal sealed-bid auctions on BOT Chain (Chain ID: 968). Zero frontrunning, private bid values, and anti-griefing guarantees.',
  keywords: ['BOT Chain', 'Bohr', 'Secret Auction', 'Sealed-Bid', 'Commit Reveal', 'NFT', 'Smart Contracts'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bot-dark text-gray-100 selection:bg-bot-500 selection:text-black antialiased">
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
