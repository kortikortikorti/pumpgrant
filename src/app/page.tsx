'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CampaignCard from '@/components/CampaignCard';
import { Zap, Lock, Wallet, Gift, TrendingUp, Users, Coins } from 'lucide-react';

interface Stats {
  total_campaigns: number;
  active_campaigns: number;
  total_sol_donated: number;
  total_claims: number;
}

interface Campaign {
  id: string;
  token_name: string;
  token_ticker: string;
  token_address: string;
  token_image_url: string | null;
  beneficiary_reddit: string;
  total_fees_accumulated: number;
  total_fees_claimed: number;
  status: string;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
    fetch('/api/campaigns').then(r => r.json()).then(setCampaigns).catch(() => {});
  }, []);

  const steps = [
    { icon: <Zap className="h-6 w-6" />, title: 'Create a Token', desc: 'Launch a token on pump.fun for the Redditor you want to support.' },
    { icon: <Lock className="h-6 w-6" />, title: 'Share Fees', desc: 'Set the fee destination to PumpGrant on pump.fun — fees get tracked automatically.' },
    { icon: <TrendingUp className="h-6 w-6" />, title: 'Trade', desc: 'Every trade generates fees that accumulate for the beneficiary.' },
    { icon: <Gift className="h-6 w-6" />, title: 'Claim', desc: 'The Redditor verifies their Reddit account, connects their wallet, and claims their accumulated SOL.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF4500]/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#FF4500]/5 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 px-4 py-1.5 mb-6">
            <div className="h-1.5 w-1.5 rounded-full bg-[#FF4500] animate-pulse" />
            <span className="text-xs text-[#FF4500] font-medium">Built on Solana × pump.fun</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Fund any Redditor through{' '}
            <span className="bg-gradient-to-r from-[#FF4500] to-[#FF6B35] bg-clip-text text-transparent">
              pump.fun tokens
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Launch a token. Share the fees. Let them claim. Every trade generates SOL that goes directly to the Redditor you choose.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/create"
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF4500] to-[#FF6B35] px-8 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-lg shadow-[#FF4500]/20"
            >
              <Zap className="h-4 w-4" />
              Create a Grant
            </Link>
            <Link
              href="/claim"
              className="flex items-center gap-2 rounded-full border border-[#333] bg-[#141414] px-8 py-3 text-sm font-semibold text-white hover:border-[#FF4500]/30 hover:bg-[#1a1a1a] transition-all"
            >
              <Wallet className="h-4 w-4" />
              Claim Your Funds
            </Link>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="rounded-xl border border-[#222] bg-[#141414]/50 backdrop-blur p-4">
                <p className="text-2xl font-bold text-white">{stats.total_campaigns}</p>
                <p className="text-xs text-gray-500 mt-1">Active Grants</p>
              </div>
              <div className="rounded-xl border border-[#222] bg-[#141414]/50 backdrop-blur p-4">
                <p className="text-2xl font-bold text-purple-400">{(stats.total_sol_donated || 0).toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">SOL Donated</p>
              </div>
              <div className="rounded-xl border border-[#222] bg-[#141414]/50 backdrop-blur p-4">
                <p className="text-2xl font-bold text-green-400">{stats.total_claims || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Claims</p>
              </div>
              <div className="rounded-xl border border-[#222] bg-[#141414]/50 backdrop-blur p-4">
                <p className="text-2xl font-bold text-[#FF4500]">{stats.active_campaigns || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Active Campaigns</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl font-bold text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative rounded-xl border border-[#222] bg-[#141414] p-6 text-center group hover:border-[#FF4500]/30 transition-colors">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#FF4500] to-[#FF6B35] text-xs font-bold text-white">
                {i + 1}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF4500]/10 text-[#FF4500] mx-auto mb-4 mt-2 group-hover:bg-[#FF4500]/20 transition-colors">
                {step.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Active Campaigns */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Active Grants</h2>
          <Link href="/create" className="text-sm text-[#FF4500] hover:underline">
            Create one →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
