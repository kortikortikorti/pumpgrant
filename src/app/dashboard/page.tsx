'use client';

import { useEffect, useState } from 'react';
import { Wallet, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import CampaignCard from '@/components/CampaignCard';

// Mock: simulate a connected wallet
const MOCK_CREATOR_WALLET = 'DRpbCBMxVnDK7maPGv7USsFnchhY1rkc3YprFLzJ6KDM';

export default function DashboardPage() {
  const [connected, setConnected] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setConnected(true);

    const res = await fetch(`/api/campaigns?creator_wallet=${MOCK_CREATOR_WALLET}`);
    const data = await res.json();
    setCampaigns(data);
    setLoading(false);
  };

  if (!connected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-32 text-center">
        <div className="rounded-2xl border border-[#222] bg-[#141414] p-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10 mx-auto mb-6">
            <Wallet className="h-10 w-10 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Creator Dashboard</h1>
          <p className="text-sm text-gray-400 mb-8">
            Connect your Solana wallet to view and manage your PumpGrant campaigns.
          </p>
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Wallet: <code className="text-purple-400 font-mono">{MOCK_CREATOR_WALLET.slice(0, 6)}...{MOCK_CREATOR_WALLET.slice(-4)}</code>
          </p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF4500] to-[#FF6B35] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Grant
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#141414] p-12 text-center">
          <p className="text-gray-500 mb-4">You haven't created any grants yet.</p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF4500] px-6 py-3 text-sm font-medium text-white hover:bg-[#FF5722] transition-colors"
          >
            Create Your First Grant
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
