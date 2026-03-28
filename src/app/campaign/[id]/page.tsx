'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Lock, Copy, Check, ExternalLink, TrendingUp, Coins, ArrowDown, BarChart3 } from 'lucide-react';
import RedditBadge from '@/components/RedditBadge';
import StatsCard from '@/components/StatsCard';
import WalletDisplay from '@/components/WalletDisplay';
import FeeTimeline from '@/components/FeeTimeline';

export default function CampaignPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF4500] border-t-transparent" />
      </div>
    );
  }

  if (!data?.campaign) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Campaign not found</p>
      </div>
    );
  }

  const { campaign, feeEvents, claims } = data;
  const available = campaign.total_fees_accumulated - campaign.total_fees_claimed;

  return (
    <div className="mx-auto max-w-4xl px-4 py-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
        {campaign.token_image_url ? (
          <img src={campaign.token_image_url} alt={campaign.token_name} className="h-16 w-16 rounded-xl bg-[#222]" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-purple-400 font-bold text-xl">
            {campaign.token_ticker.slice(0, 2)}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{campaign.token_name}</h1>
            <span className="rounded-full bg-purple-500/10 px-3 py-0.5 text-xs font-mono text-purple-400">
              ${campaign.token_ticker}
            </span>
          </div>
          {campaign.token_description && (
            <p className="text-sm text-gray-400 mb-2">{campaign.token_description}</p>
          )}
          <RedditBadge username={campaign.beneficiary_reddit} size="lg" />
        </div>
      </div>

      {/* Fee Lock Status */}
      <div className="flex items-center gap-3 rounded-xl bg-green-500/5 border border-green-500/20 p-4 mb-8">
        <Lock className="h-5 w-5 text-green-400" />
        <div>
          <p className="text-sm font-semibold text-green-400">
            LOCKED ✅ — Fees permanently directed to u/{campaign.beneficiary_reddit}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Fee authority has been revoked on-chain. This is irreversible.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Accumulated"
          value={`${campaign.total_fees_accumulated.toFixed(3)} SOL`}
          icon={<Coins className="h-4 w-4" />}
          color="purple"
        />
        <StatsCard
          label="Claimed"
          value={`${campaign.total_fees_claimed.toFixed(3)} SOL`}
          icon={<ArrowDown className="h-4 w-4" />}
          color="blue"
        />
        <StatsCard
          label="Available"
          value={`${available.toFixed(3)} SOL`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="green"
        />
        <StatsCard
          label="Total Events"
          value={feeEvents?.length || 0}
          icon={<BarChart3 className="h-4 w-4" />}
          color="orange"
        />
      </div>

      {/* Token Address */}
      <div className="rounded-xl border border-[#222] bg-[#141414] p-5 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Token Address</p>
            <code className="text-sm text-purple-400 font-mono">{campaign.token_address}</code>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(campaign.token_address); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1.5 rounded-lg bg-[#222] px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={`https://solscan.io/token/${campaign.token_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-[#222] px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Solscan
            </a>
          </div>
        </div>
      </div>

      {/* Two columns: fee events + claims */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Fee Events</h2>
          <FeeTimeline events={feeEvents || []} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Claim History</h2>
          {claims && claims.length > 0 ? (
            <div className="space-y-2">
              {claims.map((claim: any) => (
                <div key={claim.id} className="flex items-center justify-between rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-4 py-3">
                  <div>
                    <p className="text-sm text-white font-medium">
                      u/{claim.reddit_username}
                    </p>
                    <p className="text-xs text-gray-600 font-mono">{claim.tx_signature?.slice(0, 16)}...</p>
                  </div>
                  <span className="text-sm font-semibold text-[#FF4500]">
                    {claim.amount_sol.toFixed(3)} SOL
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 text-sm">No claims yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
