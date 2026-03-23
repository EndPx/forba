'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

const NAV_ITEMS = [
  { href: '/',          label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents',    label: 'Agents' },
  { href: '/payments',  label: 'Payments' },
];

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function WalletStatus() {
  const { address, isConnected } = useAccount();

  return (
    <ConnectButton.Custom>
      {({ openConnectModal, openAccountModal, chain, mounted }) => {
        if (!mounted) return null;

        if (!isConnected || !address) {
          return (
            <button
              onClick={openConnectModal}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
            >
              Connect Wallet
            </button>
          );
        }

        return (
          <button
            onClick={openAccountModal}
            className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block shrink-0" />
            <span>{chain?.name ?? 'Base Sepolia'}</span>
            <span className="text-zinc-300">|</span>
            <span className="font-mono text-zinc-400">{truncate(address)}</span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

function MobileWalletStatus() {
  const { address, isConnected } = useAccount();

  return (
    <ConnectButton.Custom>
      {({ openConnectModal, openAccountModal, chain, mounted }) => {
        if (!mounted) return null;

        if (!isConnected || !address) {
          return (
            <div className="pt-2 pb-1 border-t border-zinc-100 mt-1 px-3 py-2">
              <button
                onClick={openConnectModal}
                className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
              >
                Connect Wallet
              </button>
            </div>
          );
        }

        return (
          <div className="pt-2 pb-1 border-t border-zinc-100 mt-1">
            <button
              onClick={openAccountModal}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-700 transition-colors w-full"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block shrink-0" />
              {chain?.name ?? 'Base Sepolia'} ·{' '}
              <span className="font-mono">{truncate(address)}</span>
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-50">
      <div className="container mx-auto flex h-13 items-center px-4 gap-6" style={{ height: '52px' }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="Forba" width={28} height={28} className="h-7 w-auto" />
          <span className="font-semibold text-sm text-zinc-900 tracking-tight">Forba</span>
        </Link>

        {/* Divider */}
        <div className="hidden md:block h-4 w-px bg-zinc-200" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'text-zinc-900 font-medium bg-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: wallet status */}
        <div className="ml-auto flex items-center gap-3">
          <WalletStatus />

          {/* Mobile toggle */}
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-4 w-4 text-zinc-600" />
            ) : (
              <Menu className="h-4 w-4 text-zinc-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-100 bg-white">
          <nav className="container mx-auto px-4 py-2 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'text-zinc-900 font-medium bg-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <MobileWalletStatus />
          </nav>
        </div>
      )}
    </header>
  );
}
