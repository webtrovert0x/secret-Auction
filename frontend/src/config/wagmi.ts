import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { cookieStorage, createStorage, http } from 'wagmi';
import { botChain } from './chains';

// Default project ID (can be overridden with NEXT_PUBLIC_PROJECT_ID)
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'b56e18d47c72ab683b10814fe9495694';

export const networks = [botChain];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }) as any,
  ssr: true,
  projectId,
  networks,
  transports: {
    [botChain.id]: http('https://rpc.bohr.life'),
  },
});

export const config = wagmiAdapter.wagmiConfig;

// Initialize Reown AppKit modal on client side
if (typeof window !== 'undefined') {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [botChain],
    defaultNetwork: botChain,
    metadata: {
      name: 'BOT Secret Auction',
      description: 'Sealed-bid cryptographic NFT auctions on BOT Chain',
      url: 'https://secret-auction.botchain.ai',
      icons: ['https://scan.bohr.life/favicon.ico'],
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#00F0FF',
      '--w3m-color-mix': '#0B0F19',
      '--w3m-color-mix-strength': 40,
      '--w3m-border-radius-master': '12px',
    },
  });
}
