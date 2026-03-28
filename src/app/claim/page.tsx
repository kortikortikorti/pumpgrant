'use client';

import { useState } from 'react';
import { ExternalLink, Wallet, Check, Loader2, ArrowDown, Copy, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

interface Campaign {
  id: string;
  token_name: string;
  token_ticker: string;
  beneficiary_reddit: string;
  total_fees_accumulated: number;
  total_fees_claimed: number;
  creation_method?: string;
}

type Step = 1 | 2 | 3 | 4;

export default function ClaimPage() {
  const [step, setStep] = useState<Step>(1);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [copied, setCopied] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const cleanUsername = username.replace(/^u\//, '').trim();

  // Step 1: Generate verification code
  const handleGenerate = async () => {
    if (!cleanUsername) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/verify/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reddit_username: cleanUsername }),
      });
      const data = await res.json();
      if (data.already_verified) {
        setVerified(true);
        setStep(4);
        fetchCampaigns();
        return;
      }
      if (data.code) {
        setCode(data.code);
        setStep(2);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // Client-side Reddit check (browser fetches Reddit directly)
  const checkRedditFromBrowser = async (): Promise<boolean> => {
    try {
      const endpoints = [
        `https://www.reddit.com/user/${cleanUsername}/submitted.json?limit=25&raw_json=1`,
        `https://www.reddit.com/user/${cleanUsername}/comments.json?limit=25&raw_json=1`,
      ];
      for (const url of endpoints) {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          for (const child of (data?.data?.children || [])) {
            const d = child?.data || {};
            if ((d.title || '').includes(code) || (d.selftext || '').includes(code) || (d.body || '').includes(code)) {
              return true;
            }
          }
        }
      }
    } catch {}
    return false;
  };

  // Step 3: Check verification
  const handleVerify = async () => {
    setVerifying(true);
    setVerifyError('');
    try {
      // First try server-side
      const res = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reddit_username: cleanUsername, code }),
      });
      const data = await res.json();
      if (data.verified) {
        setVerified(true);
        setStep(4);
        fetchCampaigns();
        return;
      }

      // If server can't reach Reddit, try from browser
      if (data.needs_client_check || data.error?.includes('Server could not')) {
        const found = await checkRedditFromBrowser();
        if (found) {
          // Tell server we verified from client
          const confirmRes = await fetch('/api/verify/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reddit_username: cleanUsername, code, client_verified: true }),
          });
          const confirmData = await confirmRes.json();
          if (confirmData.verified) {
            setVerified(true);
            setStep(4);
            fetchCampaigns();
            return;
          }
        }
        setVerifyError('Code not found on your Reddit profile. Make sure you posted it publicly and try again.');
      } else {
        setVerifyError(data.error || 'Code not found. Make sure you posted it publicly on your profile.');
      }
    } catch {
      // Network error on server, try browser-only
      try {
        const found = await checkRedditFromBrowser();
        if (found) {
          const confirmRes = await fetch('/api/verify/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reddit_username: cleanUsername, code, client_verified: true }),
          });
          const confirmData = await confirmRes.json();
          if (confirmData.verified) {
            setVerified(true);
            setStep(4);
            fetchCampaigns();
            return;
          }
        }
      } catch {}
      setVerifyError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch(`/api/campaigns?reddit_username=${cleanUsername}`);
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Reddit SVG icon
  const RedditIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#FF4500">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                s < step || (s === 4 && verified)
                  ? 'bg-green-500 text-white'
                  : s === step
                  ? 'bg-[#FF4500] text-white'
                  : 'bg-[#222] text-gray-500'
              }`}
            >
              {s < step || (s === 4 && verified) ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`h-0.5 w-8 sm:w-12 transition-all ${
                  s < step ? 'bg-green-500' : 'bg-[#222]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-2">
        <p className="text-xs text-gray-500">Step {step} of 4</p>
      </div>

      {/* Step 1: Enter Reddit Username */}
      {step === 1 && (
        <div className="rounded-2xl border border-[#222] bg-[#141414] p-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <RedditIcon className="h-8 w-8" />
            <h1 className="text-2xl font-bold text-white">Verify Your Reddit Account</h1>
          </div>
          <p className="text-sm text-gray-400 text-center mb-8">
            Enter your Reddit username to start the verification process. No OAuth required — we verify through a public post on your profile.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Reddit Username</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl bg-[#0a0a0a] border border-[#333] px-4 py-3 flex-1">
                  <span className="text-gray-500 mr-1">u/</span>
                  <input
                    type="text"
                    value={username.replace(/^u\//, '')}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_username"
                    className="bg-transparent text-white outline-none flex-1 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  />
                  <RedditIcon className="h-4 w-4 ml-2 opacity-50" />
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!cleanUsername || generating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4500] py-3.5 text-sm font-semibold text-white hover:bg-[#FF5722] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Verification Code'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Post Verification Code */}
      {step === 2 && (
        <div className="rounded-2xl border border-[#222] bg-[#141414] p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Post Your Verification Code</h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            Post this code on your Reddit profile so we can verify you own <span className="text-[#FF4500]">u/{cleanUsername}</span>.
          </p>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF4500]/10 text-[#FF4500] text-xs font-bold">1</div>
                <p className="text-sm text-gray-300">Go to Reddit and log into <span className="text-white font-medium">u/{cleanUsername}</span></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF4500]/10 text-[#FF4500] text-xs font-bold">2</div>
                <p className="text-sm text-gray-300">Make a post or comment on your profile with this code:</p>
              </div>
            </div>

            {/* Code Box */}
            <div className="rounded-xl border-2 border-green-500/30 bg-[#0a0a0a] p-6">
              <div className="flex items-center justify-between">
                <code className="text-2xl font-bold text-green-400 tracking-wider font-mono">
                  {code}
                </code>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-green-400 hover:bg-green-500/20 transition-colors"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF4500]/10 text-[#FF4500] text-xs font-bold">3</div>
              <p className="text-sm text-gray-300">Come back here and click <span className="text-white font-medium">Verify</span></p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`https://www.reddit.com/user/${cleanUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF4500]/10 border border-[#FF4500]/20 py-3 text-sm font-medium text-[#FF4500] hover:bg-[#FF4500]/20 transition-colors"
              >
                Open Reddit Profile
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF4500] py-3 text-sm font-semibold text-white hover:bg-[#FF5722] transition-colors"
              >
                I&apos;ve Posted It →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Verify */}
      {step === 3 && (
        <div className="rounded-2xl border border-[#222] bg-[#141414] p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Verify Your Account</h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            Click below to check if we can find your verification code on <span className="text-[#FF4500]">u/{cleanUsername}</span>&apos;s profile.
          </p>

          <div className="space-y-4">
            {/* Show the code as reminder */}
            <div className="rounded-xl border border-[#333] bg-[#0a0a0a] p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Your verification code</p>
              <code className="text-lg font-bold text-green-400 font-mono">{code}</code>
            </div>

            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4500] py-3.5 text-sm font-semibold text-white hover:bg-[#FF5722] transition-colors disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking your Reddit profile...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Verify My Account
                </>
              )}
            </button>

            {/* Error */}
            {verifyError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Verification Failed</span>
                </div>
                <p className="text-xs text-red-400/80">{verifyError}</p>
                <button
                  onClick={handleVerify}
                  className="mt-3 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </button>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              ← Back to instructions
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Connect Wallet & Claim */}
      {step === 4 && verified && (
        <div className="space-y-6">
          {/* Verified Badge */}
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-1">Verified! ✅</h2>
            <p className="text-sm text-gray-400">
              You&apos;ve verified ownership of <span className="text-[#FF4500] font-medium">u/{cleanUsername}</span>
            </p>
          </div>

          {/* Wallet Connection */}
          <div className="rounded-2xl border border-[#222] bg-[#141414] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Your Wallet</h2>
            </div>

            {connected && publicKey ? (
              <div>
                <p className="text-xs text-gray-500 mb-3">Connected — claims will be sent to this wallet.</p>
                <div className="rounded-xl bg-[#0a0a0a] border border-green-500/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                      <code className="text-sm text-green-400 font-mono break-all">
                        {publicKey.toBase58()}
                      </code>
                    </div>
                    <Check className="h-5 w-5 text-green-400 shrink-0" />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-4">
                  Connect your Phantom or Solflare wallet to receive claimed SOL.
                </p>
                <button
                  onClick={() => setVisible(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-lg shadow-purple-600/20"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </button>
              </div>
            )}
          </div>

          {/* Campaigns / Grants */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Your Grants</h2>
            {loadingCampaigns ? (
              <div className="rounded-xl border border-[#222] bg-[#141414] p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Loading grants...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="rounded-xl border border-[#222] bg-[#141414] p-8 text-center">
                <p className="text-gray-500 text-sm">No grants found for your Reddit username.</p>
                <p className="text-gray-600 text-xs mt-1">Someone needs to create a grant with your username first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((c) => {
                  const avail = c.total_fees_accumulated - c.total_fees_claimed;
                  return (
                    <div key={c.id} className="rounded-xl border border-[#222] bg-[#141414] p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 font-bold text-sm">
                            {c.token_ticker.slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{c.token_name}</h3>
                            <span className="text-xs text-gray-500 font-mono">${c.token_ticker}</span>
                          </div>
                        </div>
                        <a href={`/campaign/${c.id}`} className="text-xs text-[#FF4500] hover:underline flex items-center gap-1">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="rounded-lg bg-[#0a0a0a] p-3">
                          <p className="text-xs text-gray-500">Accumulated</p>
                          <p className="text-sm font-semibold text-purple-400">{c.total_fees_accumulated.toFixed(3)} SOL</p>
                        </div>
                        <div className="rounded-lg bg-[#0a0a0a] p-3">
                          <p className="text-xs text-gray-500">Claimed</p>
                          <p className="text-sm font-semibold text-gray-300">{c.total_fees_claimed.toFixed(3)} SOL</p>
                        </div>
                        <div className="rounded-lg bg-[#0a0a0a] p-3">
                          <p className="text-xs text-gray-500">Available</p>
                          <p className="text-sm font-semibold text-green-400">{avail.toFixed(3)} SOL</p>
                        </div>
                      </div>

                      <ClaimButtonWallet
                        campaignId={c.id}
                        available={avail}
                        redditUsername={cleanUsername}
                        onClaimed={fetchCampaigns}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Claim Button with Wallet Adapter
   ============================================================ */
function ClaimButtonWallet({
  campaignId,
  available,
  redditUsername,
  onClaimed,
}: {
  campaignId: string;
  available: number;
  redditUsername: string;
  onClaimed?: () => void;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClaim = async () => {
    if (available <= 0) return;

    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    setState('loading');
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          reddit_username: redditUsername,
          wallet_address: publicKey.toBase58(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setState('success');
        setTxSignature(data.claim.tx_signature);
        onClaimed?.();
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Check className="h-5 w-5 text-green-400" />
          <span className="text-sm font-semibold text-green-400">Claimed Successfully!</span>
        </div>
        {txSignature && (
          <a
            href={`https://solscan.io/tx/${txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:underline font-mono"
          >
            View on Solscan →
          </a>
        )}
      </div>
    );
  }

  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet to Claim
      </button>
    );
  }

  return (
    <button
      onClick={handleClaim}
      disabled={available <= 0 || state === 'loading'}
      className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
        available <= 0
          ? 'bg-[#222] text-gray-600 cursor-not-allowed'
          : state === 'loading'
          ? 'bg-[#FF4500]/50 text-white cursor-wait'
          : state === 'error'
          ? 'bg-red-500/20 text-red-400 border border-red-500/20'
          : 'bg-gradient-to-r from-[#FF4500] to-[#FF6B35] text-white hover:opacity-90 hover:shadow-lg hover:shadow-[#FF4500]/20'
      }`}
    >
      {state === 'loading' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Claiming...
        </>
      ) : state === 'error' ? (
        'Failed — try again'
      ) : (
        <>
          <ArrowDown className="h-4 w-4" />
          {available > 0 ? `Claim ${available.toFixed(3)} SOL` : 'Nothing to Claim'}
        </>
      )}
    </button>
  );
}
