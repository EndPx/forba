'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Users, CreditCard, LayoutDashboard, Wallet, Menu, X, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',          label: 'Home',      icon: Zap },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents',    label: 'Agents',    icon: Users },
  { href: '/payments',  label: 'Payments',  icon: CreditCard },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-violet-100/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 sticky top-0 z-50 shadow-sm shadow-violet-100/40">
      <div className="container mx-auto flex h-14 items-center px-4 gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-4 group">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center shadow-sm group-hover:shadow-violet-300/50 group-hover:shadow-md transition-all duration-200">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-violet-700 to-orange-500 bg-clip-text text-transparent">
            Forba
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 border border-violet-200/60'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-violet-600' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">

          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">Live</span>
          </div>

          {/* Network badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-semibold text-blue-700">Base Sepolia</span>
          </div>

          {/* Wallet connected indicator */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50"
            title="Connected: Base Sepolia"
          >
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <Wallet className="h-3.5 w-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700 font-mono">0x701B...4eB4</span>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-4 w-4 text-slate-600" />
            ) : (
              <Menu className="h-4 w-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-violet-100 bg-white/95 backdrop-blur-md">
          <nav className="container mx-auto px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-50 text-violet-700 border border-violet-200/60'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                  {item.label}
                  <ChevronRight className="h-3.5 w-3.5 ml-auto text-slate-300" />
                </Link>
              );
            })}

            {/* Mobile network + wallet */}
            <div className="pt-2 pb-1 flex flex-col gap-2 border-t border-slate-100 mt-2">
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-700 font-medium">Live</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-semibold text-blue-700">Base Sepolia</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-semibold mx-0">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                <Wallet className="h-4 w-4" />
                <span className="font-mono">0x701B...4eB4</span>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
