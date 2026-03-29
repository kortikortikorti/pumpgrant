'use client';

import { useState } from 'react';
import { AlertCircle, Check, Copy, ExternalLink, Link2, ArrowRight, Shield } from 'lucide-react';
import Link from 'next/link';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'C8PQ5MhTQgo1wehNgq22wNMJcuuyH9f2HyHYi5XP36J';

export default function CreatePage() {
  const [created, setCreated] = useState<any>(null);

  // Step completion tracking
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const [form, setForm] = useState({
    beneficiary_reddit: '',
    campaign_title: '',
    campaign_description: '',
    token_address: '',
  });

  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const markComplete = (step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const copyWallet = () => {
    navigator.clipboard.writeText(PLATFORM_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isStep1Valid = () => {
    const reddit = form.beneficiary_reddit.replace(/^u\//, '').trim();
    return reddit.length >= 3 && form.campaign_title.trim().length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const redditName = form.beneficiary_reddit.replace(/^u\//, '').trim();
    if (!redditName || !/^[a-zA-Z0-9_-]{3,20}$/.test(redditName)) {
      setError('Invalid Reddit username');
      return;
    }

    if (!form.token_address || form.token_address.length < 32) {
      setError('Invalid token address');
      return;
    }

    // Verify on-chain
    setVerifying(true);
    try {
      const verifyRes = await fetch('/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_address: form.token_address }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.valid) {
        setVerifying(false);
        setError('Fee destination is not set correctly. Make sure you set the fee destination to our address and saved on pump.fun.');
        return;
      }
    } catch {
      setVerifying(false);
      setError('Could not verify token. Please check the address and try again.');
      return;
    }
    setVerifying(false);

    // Create campaign
    setSubmitting(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_address: form.token_address,
          token_name: form.campaign_title || 'Linked Token',
          token_ticker: form.token_address.slice(0, 6).toUpperCase(),
          token_description: form.campaign_description,
          beneficiary_reddit: redditName,
          creator_wallet: 'linked',
          creation_method: 'linked',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreated(data);
      } else {
        setError(data.error || 'Failed to create campaign');
      }
    } catch {
      setError('Network error');
    }
    setSubmitting(false);
  };

  if (created) {
    return <SuccessView data={created} onReset={() => { setCreated(null); setCompletedSteps(new Set()); setForm({ beneficiary_reddit: '', campaign_title: '', campaign_description: '', token_address: '' }); }} />;
  }

  const stepDone = (n: number) => completedSteps.has(n);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <h1 className="text-3xl font-bold mb-2">Create a Grant</h1>
      <p className="text-gray-400 mb-10">
        Follow these steps to create a pump.fun token with fees going to a Redditor.
      </p>

      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-6 top-12 bottom-12 w-px bg-gradient-to-b from-orange-500/40 via-green-500/40 to-blue-500/40" />

        <div className="space-y-8">

          {/* ─── Step 1: Who are you funding? ─── */}
          <div className="relative">
            <StepNumber num={1} done={stepDone(1)} />
            <div className="ml-16">
              <div className="rounded-xl border-l-4 border-l-orange-500 border border-[#222] bg-[#141414] p-6">
                <h2 className="text-lg font-bold text-white mb-1">Who are you funding?</h2>
                <p className="text-sm text-gray-500 mb-5">Tell us about the Redditor you want to support.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Reddit Username</label>
                    <div className="flex items-center rounded-xl border border-[#222] bg-[#0e0e0e] overflow-hidden focus-within:border-orange-500/50 transition-colors">
                      <span className="px-3 text-sm text-gray-500 bg-[#0a0a0a] py-3 border-r border-[#222]">u/</span>
                      <input
                        type="text"
                        placeholder="username"
                        value={form.beneficiary_reddit}
                        onChange={e => setForm(f => ({ ...f, beneficiary_reddit: e.target.value }))}
                        onBlur={() => { if (isStep1Valid()) markComplete(1); }}
                        className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder-gray-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Fund u/someone for their amazing work"
                      value={form.campaign_title}
                      onChange={e => setForm(f => ({ ...f, campaign_title: e.target.value }))}
                      onBlur={() => { if (isStep1Valid()) markComplete(1); }}
                      className="w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Short Description <span className="text-gray-600">(optional)</span>
                    </label>
                    <textarea
                      placeholder="Why does this Redditor deserve support?"
                      value={form.campaign_description}
                      onChange={e => setForm(f => ({ ...f, campaign_description: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Step 2: Create your token on pump.fun ─── */}
          <div className="relative">
            <StepNumber num={2} done={stepDone(2)} />
            <div className="ml-16">
              <div className="rounded-xl border border-[#222] bg-[#141414] p-6">
                <h2 className="text-lg font-bold text-white mb-1">Create your token on pump.fun</h2>
                <p className="text-sm text-gray-500 mb-5">Launch your token on pump.fun as you normally would.</p>

                <a
                  href="https://pump.fun/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markComplete(2)}
                  className="flex items-center justify-center gap-3 w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-4 text-base font-bold text-white hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
                >
                  Open pump.fun
                  <ArrowRight className="h-5 w-5" />
                </a>
                <p className="text-xs text-gray-500 text-center mt-3">
                  Create your token as normal. Come back here when done.
                </p>
              </div>
            </div>
          </div>

          {/* ─── Step 3: Set up fee sharing ─── */}
          <div className="relative">
            <StepNumber num={3} done={stepDone(3)} />
            <div className="ml-16">
              <div className="rounded-xl border border-[#222] bg-[#141414] p-6">
                <h2 className="text-lg font-bold text-white mb-1">Set up fee sharing</h2>
                <p className="text-sm text-gray-500 mb-6">After creating your token on pump.fun:</p>

                <div className="space-y-4 mb-6">
                  <SubStep num={1} text="Go to your token's page on pump.fun" icon="🌐" />
                  <SubStep num={2} text='Click "Share creator rewards"' icon="⚙️" />

                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#222] text-xs font-bold text-gray-400 shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">Paste this address and set to <strong className="text-white">100%</strong>:</p>

                      {/* Big wallet address box */}
                      <div className="mt-3 rounded-xl border-2 border-green-500/40 bg-green-500/5 p-4">
                        <p className="text-xs text-green-400 font-medium mb-2">PumpGrant Platform Wallet</p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <code className="flex-1 text-sm sm:text-base text-white font-mono bg-[#0a0a0a] rounded-lg px-4 py-3 border border-green-500/20 break-all select-all">
                            {PLATFORM_WALLET}
                          </code>
                          <button
                            onClick={() => { copyWallet(); markComplete(3); }}
                            className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all shrink-0 ${
                              copied
                                ? 'bg-green-500/30 text-green-300 border-2 border-green-400/50'
                                : 'bg-green-500/20 text-green-300 border-2 border-green-500/40 hover:bg-green-500/30 hover:border-green-400/60'
                            }`}
                          >
                            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                            {copied ? 'Copied! ✓' : 'COPY'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <SubStep num={4} text="Click Save to start directing fees to PumpGrant" icon="💾" />
                </div>

                <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 px-4 py-3 flex items-start gap-2">
                  <span className="text-base shrink-0">ℹ️</span>
                  <p className="text-xs text-yellow-400/80">
                    Your campaign will show as &quot;Pending&quot; until the first trading fee is received, then it will be automatically verified.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Step 4: Link your token ─── */}
          <div className="relative">
            <StepNumber num={4} done={stepDone(4)} />
            <div className="ml-16">
              <div className="rounded-xl border border-[#222] bg-[#141414] p-6">
                <h2 className="text-lg font-bold text-white mb-1">Link your token</h2>
                <p className="text-sm text-gray-500 mb-5">Paste your token address and we&apos;ll verify everything on-chain.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Token Address (CA)</label>
                    <input
                      type="text"
                      placeholder="Paste your pump.fun token address..."
                      value={form.token_address}
                      onChange={e => setForm(f => ({ ...f, token_address: e.target.value.trim() }))}
                      className="w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors font-mono"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || verifying}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-4 text-base font-bold text-white hover:opacity-90 transition-opacity shadow-lg shadow-blue-600/20 disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Verifying on-chain...
                      </>
                    ) : submitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Creating campaign...
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        Verify &amp; Create Campaign
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Step Number Circle ─── */
function StepNumber({ num, done }: { num: number; done: boolean }) {
  return (
    <div className="absolute left-0 top-6 z-10">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-all ${
          done
            ? 'bg-green-500/20 border-2 border-green-500/50 text-green-400'
            : 'bg-[#1a1a1a] border-2 border-[#333] text-gray-400'
        }`}
      >
        {done ? <Check className="h-6 w-6" /> : num}
      </div>
    </div>
  );
}

/* ─── Sub-Step Item ─── */
function SubStep({ num, text, icon }: { num: number; text: string; icon: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#222] text-xs font-bold text-gray-400 shrink-0">
        {num}
      </div>
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  );
}

/* ─── Success View ─── */
function SuccessView({ data, onReset }: { data: any; onReset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <div className="rounded-2xl border border-green-500/20 bg-[#141414] p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mx-auto mb-4">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Campaign Created!</h1>
        <p className="text-sm text-amber-400 font-medium mb-2">Status: ⏳ Pending</p>
        <p className="text-sm text-gray-400 mb-6">
          Your campaign will be automatically verified once the first trading fee arrives. Make sure you&apos;ve set the fee sharing to PumpGrant&apos;s wallet on pump.fun.
        </p>

        <div className="space-y-3 text-left mb-6">
          <div className="rounded-xl bg-[#0a0a0a] border border-[#222] p-4">
            <p className="text-xs text-gray-500 mb-1">Token Address</p>
            <div className="flex items-center justify-between">
              <code className="text-sm text-purple-400 font-mono break-all">{data.token_address}</code>
              <button
                onClick={() => navigator.clipboard.writeText(data.token_address)}
                className="text-gray-500 hover:text-white ml-2 shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {data.fee_vault_address && (
            <div className="rounded-xl bg-[#0a0a0a] border border-[#222] p-4">
              <p className="text-xs text-gray-500 mb-1">Fee Vault</p>
              <code className="text-sm text-purple-400 font-mono break-all">{data.fee_vault_address}</code>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href={`/campaign/${data.id}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF4500] to-[#FF6B35] py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            View Campaign
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={onReset}
            className="flex-1 rounded-xl border border-[#333] py-3 text-sm font-medium text-gray-400 hover:text-white hover:border-[#444] transition-colors"
          >
            Create Another
          </button>
        </div>
      </div>
    </div>
  );
}
