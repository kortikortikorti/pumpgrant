'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Copy, Check, ExternalLink, TrendingUp, Coins, ArrowDown, BarChart3, Loader2, CheckCircle, Lock, Unlock, Users, Shield, RefreshCw } from 'lucide-react';
import RedditBadge from '@/components/RedditBadge';
import StatsCard from '@/components/StatsCard';
import FeeTimeline from '@/components/FeeTimeline';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'C8PQ5MhTQgo1wehNgq22wNMJcuuyH9f2HyHYi5XP36J';

export default function CampaignPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [verifyData, setVerifyData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

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
          // Auto-verify on-chain when campaign loads
          if (d.token_address) {
            verifyOnChain(d.token_address);
          }
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

  const verifyOnChain = async (tokenAddress: string) => {
    setVerifying(true);
    try {
      const res = await fetch('/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_address: tokenAddress }),
      });
      const result = await res.json();
      setVerifyData(result);
    } catch (err) {
      console.error('On-chain verification failed:', err);
    }
    setVerifying(false);
  };

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

  // On-chain verification state
  const onChainVerified = verifyData?.valid === true;
  const configExists = verifyData?.config_exists === true;
  const isLocked = verifyData?.is_locked === true;
  const shareholders = verifyData?.shareholders || [];

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

      {/* On-Chain Verification Status */}
      <OnChainVerificationBanner
        verifyData={verifyData}
        verifying={verifying}
        campaign={campaign}
        onRefresh={() => verifyOnChain(campaign.token_address)}
      />

      {/* Shareholders Display */}
      {shareholders.length > 0 && (
        <div className="rounded-xl border border-[#222] bg-[#141414] p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <p className="text-sm font-semibold text-white">On-Chain Fee Shareholders</p>
            </div>
            {isLocked ? (
              <div className="flex items-center gap-1 text-green-400">
                <Lock className="h-3 w-3" />
                <span className="text-xs">Locked</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-400">
                <Unlock className="h-3 w-3" />
                <span className="text-xs">Editable</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {shareholders.map((sh: any, i: number) => {
              const isPumpGrant = sh.address === PLATFORM_WALLET;
              return (
                <div key={i} className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  isPumpGrant ? 'bg-green-500/5 border border-green-500/20' : 'bg-[#0a0a0a] border border-[#1a1a1a]'
                }`}>
                  <div className="flex items-center gap-2">
                    {isPumpGrant && <Shield className="h-4 w-4 text-green-400" />}
                    <code className={`text-sm font-mono ${isPumpGrant ? 'text-green-400' : 'text-purple-400'}`}>
                      {isPumpGrant ? 'PumpGrant Wallet' : `${sh.address.slice(0, 10)}...${sh.address.slice(-6)}`}
                    </code>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${isPumpGrant ? 'text-green-400' : 'text-gray-400'}`}>
                      {sh.percentage}
                    </span>
                    <span className="text-xs text-gray-600">({sh.shareBps} bps)</span>
                  </div>
                </div>
              );
            })}
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

/* ─── On-Chain Verification Banner ─── */
function OnChainVerificationBanner({ verifyData, verifying, campaign, onRefresh }: {
  verifyData: any;
  verifying: boolean;
  campaign: any;
  onRefresh: () => void;
}) {
  // Loading state
  if (verifying && !verifyData) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 mb-8">
        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
        <div>
          <p className="text-sm font-semibold text-blue-400">Verifying on-chain...</p>
          <p className="text-xs text-gray-500 mt-0.5">Reading fee sharing config from Solana</p>
        </div>
      </div>
    );
  }

  // No verify data yet — fallback to campaign status
  if (!verifyData) {
    if (campaign.status === 'pending') {
      return (
        <div className="flex items-center gap-3 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 mb-8">
          <Clock className="h-5 w-5 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-400">⏳ Pending Verification</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Waiting for on-chain verification. Make sure fee sharing is set up on pump.fun.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 rounded-xl bg-green-500/5 border border-green-500/20 p-4 mb-8">
        <CheckCircle className="h-5 w-5 text-green-400" />
        <p className="text-sm font-semibold text-green-400">✅ Verified</p>
      </div>
    );
  }

  const onChainVerified = verifyData.valid === true;
  const configExists = verifyData.config_exists === true;
  const isLocked = verifyData.is_locked === true;
  const isFallback = verifyData.fallback === true;

  // Verified on-chain
  if (onChainVerified) {
    return (
      <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-400">
                ✅ Verified on-chain — Trading fees directed to PumpGrant
              </p>
              <div className="flex items-center gap-3 mt-1">
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-400/70">
                    <Lock className="h-3 w-3" /> Locked — Cannot be changed
                  </span>
                )}
                {!isLocked && configExists && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400/70">
                    <Unlock className="h-3 w-3" /> Not locked yet
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={verifying}
            className="text-gray-600 hover:text-white transition-colors p-1"
            title="Re-verify on-chain"
          >
            <RefreshCw className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // Config exists but PumpGrant not a shareholder
  if (configExists && !onChainVerified) {
    return (
      <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-400">
                ❌ Fee sharing exists but PumpGrant wallet is not a shareholder
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                The token has a fee sharing config, but it doesn&apos;t include PumpGrant&apos;s wallet.
                {isLocked && ' The config is locked and cannot be changed.'}
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={verifying}
            className="text-gray-600 hover:text-white transition-colors p-1"
          >
            <RefreshCw className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // No config — pending or fallback
  return (
    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-400">
              {isFallback ? '⚠️ On-chain verification unavailable' : '⏳ No fee sharing config found'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isFallback
                ? 'Could not read on-chain data. Will retry automatically.'
                : 'Fee sharing has not been configured yet. Set it up on pump.fun to verify.'}
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={verifying}
          className="text-gray-600 hover:text-white transition-colors p-1"
        >
          <RefreshCw className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
