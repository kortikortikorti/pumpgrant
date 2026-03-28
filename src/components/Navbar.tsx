'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Zap, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#222] bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF4500] to-[#FF6B35]">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white group-hover:text-[#FF4500] transition-colors">
              PumpGrant
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/create" className="text-sm text-gray-400 hover:text-white transition-colors">
              Create Grant
            </Link>
            <Link href="/claim" className="text-sm text-gray-400 hover:text-white transition-colors">
              Claim Funds
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">
              How It Works
            </Link>

            {connected ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5">
                  {truncatedAddress}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setVisible(true)}
                className="flex items-center gap-2 rounded-full bg-[#141414] border border-[#333] px-4 py-2 text-sm font-medium text-white hover:border-[#FF4500]/30 hover:bg-[#1a1a1a] transition-all"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            )}
          </div>

          <button
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/create" className="block px-3 py-2 text-sm text-gray-400 hover:text-white" onClick={() => setMobileOpen(false)}>Create Grant</Link>
            <Link href="/claim" className="block px-3 py-2 text-sm text-gray-400 hover:text-white" onClick={() => setMobileOpen(false)}>Claim Funds</Link>
            <Link href="/dashboard" className="block px-3 py-2 text-sm text-gray-400 hover:text-white" onClick={() => setMobileOpen(false)}>Dashboard</Link>
            <Link href="/about" className="block px-3 py-2 text-sm text-gray-400 hover:text-white" onClick={() => setMobileOpen(false)}>How It Works</Link>
            {connected ? (
              <div className="px-3 py-2 space-y-2">
                <span className="text-xs text-gray-400 font-mono">{truncatedAddress}</span>
                <button onClick={() => { disconnect(); setMobileOpen(false); }} className="block text-xs text-red-400">Disconnect</button>
              </div>
            ) : (
              <button
                onClick={() => { setVisible(true); setMobileOpen(false); }}
                className="mx-3 flex items-center gap-2 rounded-lg bg-[#141414] border border-[#333] px-4 py-2 text-sm text-white"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
