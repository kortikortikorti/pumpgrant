'use client';

import { useEffect, useState } from 'react';
import { Wallet, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import CampaignCard from '@/components/CampaignCard';

export default function DashboardPage() {
  const { connected, publicKey, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      setLoading(true);
      setError(null);
      fetch(`/api/campaigns?wallet=${publicKey.toBase58()}`)
        .then(r => r.json())
        .then(data => {
          setCampaigns(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch campaigns:', err);
          setError('Failed to load campaigns. Please try again.');
          setLoading(false);
        });
    }
  }, [connected, publicKey]);

  // Show spinner while wallet is auto-reconnecting
  if (connecting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Connecting wallet...</p>
        </div>
      </div>
    );
  }

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
            onClick={() => setVisible(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
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
            Wallet: <code className="text-purple-400 font-mono">{publicKey?.toBase58().slice(0, 6)}...{publicKey?.toBase58().slice(-4)}</code>
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

      {loading ? (
        <div className="rounded-xl border border-[#222] bg-[#141414] p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your campaigns...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-12 text-center">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              if (publicKey) {
                setLoading(true);
                setError(null);
                fetch(`/api/campaigns?wallet=${publicKey.toBase58()}`)
                  .then(r => r.json())
                  .then(data => { setCampaigns(Array.isArray(data) ? data : []); setLoading(false); })
                  .catch(() => { setError('Failed to load campaigns.'); setLoading(false); });
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#222] px-6 py-3 text-sm font-medium text-white hover:bg-[#333] transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#141414] p-12 text-center">
          <p className="text-gray-500 mb-4">You haven&apos;t created any grants yet.</p>
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
