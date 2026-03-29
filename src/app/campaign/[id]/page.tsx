'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Copy, Check, ExternalLink, TrendingUp, Coins, ArrowDown, BarChart3, Loader2, CheckCircle } from 'lucide-react';
import RedditBadge from '@/components/RedditBadge';
import StatsCard from '@/components/StatsCard';
import FeeTimeline from '@/components/FeeTimeline';

export default function CampaignPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/campaigns/${id}`);
        if (!res.ok) {
          setError('Campaign not found');
          setLoading(false);
          return;
        }
        const d = await res.json();
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      } catch (err) {
        console.error('Failed to fetch campaign:', err);
        setError('Failed to load campaign. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-2">Campaign not found</p>
          <p className="text-gray-600 text-sm">{error || 'The campaign you\'re looking for doesn\'t exist.'}</p>
        </div>
      </div>
    );
  }

  const campaign = data;
  const claims = data.claims || [];
  const feeEvents = data.feeEvents || [];
  const available = (campaign.total_fees_accumulated || 0) - (campaign.total_fees_claimed || 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
        {campaign.token_image_url ? (
          <img src={campaign.token_image_url} alt={campaign.token_name} className="h-16 w-16 rounded-xl bg-[#222]" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-purple-400 font-bold text-xl">
            {(campaign.token_ticker || '??').slice(0, 2)}
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
          <div className="flex items-center gap-2 mt-2">
            <a
              href={`https://pump.fun/coin/${campaign.token_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              View on pump.fun
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={`https://solscan.io/token/${campaign.token_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              View on Solscan
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Verification Status */}
      {campaign.status === 'pending' ? (
        <div className="flex items-center gap-3 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 mb-8">
          <Clock className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-400">
              ⏳ Pending Verification
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              This campaign will be verified once the first trading fee arrives at PumpGrant&apos;s wallet. Make sure you&apos;ve set the fee sharing on pump.fun correctly.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-green-500/5 border border-green-500/20 p-4 mb-8">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <div>
            <p className="text-sm font-semibold text-green-400">
              ✅ Verified — Trading fees are being received on-chain.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Accumulated"
          value={`${(campaign.total_fees_accumulated || 0).toFixed(3)} SOL`}
          icon={<Coins className="h-4 w-4" />}
          color="purple"
        />
        <StatsCard
          label="Claimed"
          value={`${(campaign.total_fees_claimed || 0).toFixed(3)} SOL`}
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
          value={feeEvents.length || 0}
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
          <FeeTimeline events={feeEvents} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Claim History</h2>
          {claims.length > 0 ? (
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
                    {(claim.amount_sol || 0).toFixed(3)} SOL
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
