import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Forba',
  projectId: 'forba-hackathon-2026', // WalletConnect project ID (optional for dev)
  chains: [baseSepolia],
  ssr: true,
});
