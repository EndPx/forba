'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',          label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents',    label: 'Agents' },
  { href: '/payments',  label: 'Payments' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-50">
      <div className="container mx-auto flex h-13 items-center px-4 gap-6" style={{ height: '52px' }}>

        {/* Logo */}
        <Link href="/" className="font-semibold text-sm text-zinc-900 tracking-tight shrink-0">
          Forba
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

        {/* Right: network info */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
            Base Sepolia
          </div>
          <div className="hidden sm:block text-xs font-mono text-zinc-400">
            0x701B…4eB4
          </div>

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
            <div className="pt-2 pb-1 border-t border-zinc-100 mt-1">
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                Base Sepolia · <span className="font-mono">0x701B…4eB4</span>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
