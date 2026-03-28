'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Wallet, Check, Loader2, ArrowDown, Copy, CheckCircle2, XCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

interface Campaign {
  id: string;
  token_name: string;
  token_ticker: string;
  token_address: string;
  beneficiary_reddit: string;
  total_fees_accumulated: number;
  total_fees_claimed: number;
  creation_method?: string;
}

type AuthState = 'connecting' | 'checking' | 'linked' | 'unlinked';
type VerifyStep = 'enter' | 'code' | 'posted' | 'done';

export default function ClaimPage() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  // Auth state
  const [authState, setAuthState] = useState<AuthState>('connecting');
  const [linkedUsername, setLinkedUsername] = useState<string | null>(null);

  // Verification flow (for unlinked wallets)
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('enter');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [copied, setCopied] = useState(false);
  const [postUrl, setPostUrl] = useState('');
  const [showPostUrlInput, setShowPostUrlInput] = useState(false);

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const cleanUsername = username.replace(/^u\//, '').trim();

  // Check if wallet is linked to a verified Reddit user
  const checkWalletLink = useCallback(async (walletAddress: string) => {
    setAuthState('checking');
    try {
      const res = await fetch(`/api/verify/wallet?wallet_address=${walletAddress}`);
      const data = await res.json();
      if (data.verified && data.reddit_username) {
        setLinkedUsername(data.reddit_username);
        setAuthState('linked');
        fetchCampaigns(data.reddit_username);
      } else {
        setAuthState('unlinked');
      }
    } catch {
      setAuthState('unlinked');
    }
  }, []);

  // Auto-check when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      checkWalletLink(publicKey.toBase58());
    } else {
      setAuthState('connecting');
      setLinkedUsername(null);
    }
  }, [connected, publicKey, checkWalletLink]);

  const fetchCampaigns = async (redditUser: string) => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch(`/api/campaigns?reddit_username=${redditUser}`);
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

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
        // Already verified — link wallet now
        if (publicKey) {
          await linkWalletToExistingVerification();
        }
        return;
      }
      if (data.code) {
        setCode(data.code);
        setVerifyStep('code');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // Link wallet to already-verified user by re-verifying
  const linkWalletToExistingVerification = async () => {
    // For already-verified users, we need them to re-verify to link wallet
    setVerifyError('This Reddit account is already verified. Please verify again to link your wallet.');
  };

  const PUMP_CODE_RE = /PUMP-[A-Z0-9]{4}-GRANT/;

  const checkRedditProfile = async (): Promise<string | null> => {
    const urls = [
      `https://www.reddit.com/user/${cleanUsername}/submitted.json?limit=25&raw_json=1`,
      `https://www.reddit.com/user/${cleanUsername}/overview.json?limit=25&raw_json=1`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          const match = text.match(PUMP_CODE_RE);
          if (match) return match[0];
        }
      } catch {}
    }
    return null;
  };

  const checkRedditPostUrl = async (url: string): Promise<string | null> => {
    try {
      let cleanUrl = url.split('?')[0].replace(/\/+$/, '');
      if (!cleanUrl.endsWith('.json')) cleanUrl += '.json';
      cleanUrl += '?raw_json=1';
      const res = await fetch(cleanUrl);
      if (res.ok) {
        const text = await res.text();
        const match = text.match(PUMP_CODE_RE);
        if (match && text.toLowerCase().includes(cleanUsername.toLowerCase())) {
          return match[0];
        }
      }
    } catch {}
    return null;
  };

  // Verify Reddit + link wallet
  const handleVerify = async () => {
    if (!publicKey) {
      setVerifyError('Please connect your wallet first before verifying.');
      return;
    }

    setVerifying(true);
    setVerifyError('');
    try {
      let foundCode: string | null = null;

      if (postUrl) {
        foundCode = await checkRedditPostUrl(postUrl);
      }
      if (!foundCode) {
        foundCode = await checkRedditProfile();
      }

      if (foundCode) {
        const res = await fetch('/api/verify/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reddit_username: cleanUsername,
            found_code: foundCode,
            client_verified: true,
            wallet_address: publicKey.toBase58(),
          }),
        });
        const data = await res.json();
        if (data.verified) {
          setLinkedUsername(cleanUsername);
          setAuthState('linked');
          setVerifyStep('done');
          fetchCampaigns(cleanUsername);
          return;
        } else if (data.error) {
          setVerifyError(data.error);
          return;
        }
      }

      setShowPostUrlInput(true);
      setVerifyError('Could not find the code automatically. Paste the link to your Reddit post below and try again.');
    } catch {
      setShowPostUrlInput(true);
      setVerifyError('Could not check Reddit. Paste your Reddit post link below.');
    } finally {
      setVerifying(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const RedditIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#FF4500">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  );

  // ─── RENDER ───

  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      {/* Wallet Connection - Always at top */}
      <div className="rounded-2xl border border-[#222] bg-[#141414] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Wallet</h2>
        </div>

        {connected && publicKey ? (
          <div className="rounded-xl bg-[#0a0a0a] border border-green-500/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Connected</p>
                <code className="text-sm text-green-400 font-mono break-all">
                  {publicKey.toBase58()}
                </code>
              </div>
              <Check className="h-5 w-5 text-green-400 shrink-0" />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-4">
              Connect your Phantom wallet to get started. Your wallet is your identity.
            </p>
            <button
              onClick={() => setVisible(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-lg shadow-purple-600/20"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          </div>
        )}
      </div>

      {/* Auth State: Checking */}
      {authState === 'checking' && (
        <div className="rounded-2xl border border-[#222] bg-[#141414] p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Checking wallet...</p>
        </div>
      )}

      {/* Auth State: Linked (returning user) */}
      {authState === 'linked' && linkedUsername && (
        <div className="space-y-6">
          {/* Verified Badge */}
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
            <div className="flex items-center gap-4">
              <ShieldCheck className="h-10 w-10 text-green-400 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white">Wallet Verified ✅</h2>
                <p className="text-sm text-gray-400">
                  Linked to <span className="text-[#FF4500] font-medium">u/{linkedUsername}</span>
                </p>
              </div>
            </div>
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
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://pump.fun/coin/${c.token_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                          >
                            pump.fun <ExternalLink className="h-3 w-3" />
                          </a>
                          <a href={`/campaign/${c.id}`} className="text-xs text-[#FF4500] hover:underline flex items-center gap-1">
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
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
                        redditUsername={linkedUsername}
                        onClaimed={() => fetchCampaigns(linkedUsername)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth State: Unlinked (new user - verification flow) */}
      {authState === 'unlinked' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-yellow-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-400">Wallet Not Linked</p>
                <p className="text-xs text-gray-400 mt-1">
                  This wallet is not linked to any verified Reddit account. Verify your Reddit username below to link it permanently.
                </p>
              </div>
            </div>
          </div>

          {/* Step: Enter Username */}
          {verifyStep === 'enter' && (
            <div className="rounded-2xl border border-[#222] bg-[#141414] p-8">
              <div className="flex items-center justify-center gap-3 mb-6">
                <RedditIcon className="h-8 w-8" />
                <h1 className="text-2xl font-bold text-white">Verify Your Reddit Account</h1>
              </div>
              <p className="text-sm text-gray-400 text-center mb-8">
                Enter your Reddit username to start verification. Your wallet will be permanently linked to this account.
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

                {verifyError && (
                  <p className="text-sm text-red-400 text-center">{verifyError}</p>
                )}
              </div>
            </div>
          )}

          {/* Step: Show Code */}
          {verifyStep === 'code' && (
            <div className="rounded-2xl border border-[#222] bg-[#141414] p-8">
              <h1 className="text-2xl font-bold text-white text-center mb-2">Post Your Verification Code</h1>
              <p className="text-sm text-gray-400 text-center mb-8">
                Post this code on your Reddit profile so we can verify you own <span className="text-[#FF4500]">u/{cleanUsername}</span>.
              </p>

              <div className="space-y-6">
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
                    onClick={() => setVerifyStep('posted')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF4500] py-3 text-sm font-semibold text-white hover:bg-[#FF5722] transition-colors"
                  >
                    I&apos;ve Posted It →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Verify */}
          {verifyStep === 'posted' && (
            <div className="rounded-2xl border border-[#222] bg-[#141414] p-8">
              <h1 className="text-2xl font-bold text-white text-center mb-2">Verify Your Account</h1>
              <p className="text-sm text-gray-400 text-center mb-8">
                Click below to check if we can find your verification code on <span className="text-[#FF4500]">u/{cleanUsername}</span>&apos;s profile.
              </p>

              <div className="space-y-4">
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
                      Verify &amp; Link Wallet
                    </>
                  )}
                </button>

                {showPostUrlInput && (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                    <p className="text-sm text-yellow-400 mb-3">Paste the link to your Reddit post:</p>
                    <input
                      type="text"
                      placeholder="https://www.reddit.com/user/..."
                      value={postUrl}
                      onChange={e => setPostUrl(e.target.value)}
                      className="w-full rounded-lg border border-[#333] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-500/50 mb-3"
                    />
                    <button
                      onClick={handleVerify}
                      disabled={verifying || !postUrl}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-yellow-600 py-2.5 text-sm font-semibold text-white hover:bg-yellow-500 transition-colors disabled:opacity-50"
                    >
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Verify with Post Link
                    </button>
                  </div>
                )}

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
                  onClick={() => setVerifyStep('code')}
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  ← Back to instructions
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Not connected state */}
      {authState === 'connecting' && !connected && (
        <div className="rounded-2xl border border-[#222] bg-[#141414] p-8 text-center">
          <Wallet className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-sm text-gray-400 mb-6">
            Connect your Phantom wallet to check if you have any grants to claim, or to verify your Reddit account.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-lg shadow-purple-600/20"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
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
