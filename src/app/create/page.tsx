'use client';

import { useState, useRef, useCallback } from 'react';
import { AlertCircle, Check, Copy, ExternalLink, ArrowRight, Shield, Plus, Link2, Upload, Image as ImageIcon, Users, Lock, Unlock, X } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { VersionedTransaction } from '@solana/web3.js';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'C8PQ5MhTQgo1wehNgq22wNMJcuuyH9f2HyHYi5XP36J';

type FlowMode = 'choose' | 'existing' | 'create';

export default function CreatePage() {
  const [mode, setMode] = useState<FlowMode>('choose');
  const [created, setCreated] = useState<any>(null);

  if (created) {
    return <SuccessView data={created} onReset={() => { setCreated(null); setMode('choose'); }} />;
  }

  if (mode === 'choose') {
    return <ChooseFlow onSelect={setMode} />;
  }

  if (mode === 'existing') {
    return <ExistingTokenFlow onCreated={setCreated} onBack={() => setMode('choose')} />;
  }

  return <CreateTokenFlow onCreated={setCreated} onBack={() => setMode('choose')} />;
}

/* ─── Choose Flow ─── */
function ChooseFlow({ onSelect }: { onSelect: (mode: FlowMode) => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <h1 className="text-3xl font-bold mb-2">Create a Grant</h1>
      <p className="text-gray-400 mb-10">
        Choose how you want to set up your PumpGrant campaign.
      </p>

      <div className="space-y-4">
        {/* Option A: Existing Token */}
        <button
          onClick={() => onSelect('existing')}
          className="w-full text-left rounded-2xl border-2 border-[#222] bg-[#141414] p-6 hover:border-blue-500/50 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <Link2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                I already have a token
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Paste your pump.fun token address. We&apos;ll verify the fee sharing on-chain and show the real shareholders.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">On-chain verification</span>
                <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Real-time data</span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-blue-400 transition-colors mt-1" />
          </div>
        </button>

        {/* Option B: Create New Token */}
        <button
          onClick={() => onSelect('create')}
          className="w-full text-left rounded-2xl border-2 border-[#222] bg-[#141414] p-6 hover:border-orange-500/50 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
              <Plus className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                Create a new token
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Launch a new pump.fun token directly from PumpGrant. Signs with your wallet — real on-chain token creation.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">SPL Token-2022</span>
                <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">On-chain creation</span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-orange-400 transition-colors mt-1" />
          </div>
        </button>
      </div>
    </div>
  );
}

/* ─── Existing Token Flow ─── */
function ExistingTokenFlow({ onCreated, onBack }: { onCreated: (data: any) => void; onBack: () => void }) {
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
  const [verifyResult, setVerifyResult] = useState<any>(null);

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

  const handleVerify = async () => {
    if (!form.token_address || form.token_address.length < 32) {
      setError('Invalid token address');
      return;
    }

    setVerifying(true);
    setError('');
    setVerifyResult(null);

    try {
      const res = await fetch('/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_address: form.token_address }),
      });
      const data = await res.json();
      setVerifyResult(data);

      if (data.valid) {
        markComplete(4);
      }
    } catch {
      setError('Could not verify token. Please check the address and try again.');
    }
    setVerifying(false);
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

    if (!verifyResult) {
      await handleVerify();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_address: form.token_address,
          token_name: verifyResult?.token_name || form.campaign_title || 'Linked Token',
          token_ticker: verifyResult?.token_symbol || form.token_address.slice(0, 6).toUpperCase(),
          token_description: form.campaign_description,
          beneficiary_reddit: redditName,
          creator_wallet: 'linked',
          creation_method: 'linked',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated({ ...data, verify_result: verifyResult });
      } else {
        setError(data.error || 'Failed to create campaign');
      }
    } catch {
      setError('Network error');
    }
    setSubmitting(false);
  };

  const stepDone = (n: number) => completedSteps.has(n);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-white mb-6 flex items-center gap-1">
        ← Back to options
      </button>
      <h1 className="text-3xl font-bold mb-2">Link Existing Token</h1>
      <p className="text-gray-400 mb-10">
        Set up fee sharing on pump.fun, then link your token here for on-chain verification.
      </p>

      <div className="relative">
        <div className="absolute left-6 top-12 bottom-12 w-px bg-gradient-to-b from-orange-500/40 via-green-500/40 to-blue-500/40" />

        <div className="space-y-8">

          {/* Step 1 */}
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

          {/* Step 2 */}
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

          {/* Step 3 */}
          <div className="relative">
            <StepNumber num={3} done={stepDone(3)} />
            <div className="ml-16">
              <div className="rounded-xl border border-[#222] bg-[#141414] p-6">
                <h2 className="text-lg font-bold text-white mb-1">Set up fee sharing</h2>
                <p className="text-sm text-gray-500 mb-6">After creating your token on pump.fun:</p>
                <div className="space-y-4 mb-6">
                  <SubStep num={1} text="Go to your token's page on pump.fun" />
                  <SubStep num={2} text='Click "Share creator rewards"' />
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#222] text-xs font-bold text-gray-400 shrink-0 mt-0.5">3</div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">Paste this address and set to <strong className="text-white">100%</strong>:</p>
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
                  <SubStep num={4} text="Click Save to lock the fee sharing configuration" />
                </div>
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 flex items-start gap-2">
                  <span className="text-base shrink-0">⚠️</span>
                  <p className="text-xs text-amber-400/80">
                    Fee sharing is <strong>locked permanently</strong> after configuration. Make sure the address is correct before saving.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <StepNumber num={4} done={stepDone(4)} />
            <div className="ml-16">
              <div className="rounded-xl border border-[#222] bg-[#141414] p-6">
                <h2 className="text-lg font-bold text-white mb-1">Verify & link your token</h2>
                <p className="text-sm text-gray-500 mb-5">Paste your token address — we&apos;ll verify the fee sharing on-chain.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Token Address (CA)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste your pump.fun token address..."
                        value={form.token_address}
                        onChange={e => { setForm(f => ({ ...f, token_address: e.target.value.trim() })); setVerifyResult(null); }}
                        className="flex-1 rounded-xl border border-[#222] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleVerify}
                        disabled={verifying || !form.token_address}
                        className="rounded-xl bg-[#222] px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#333] transition-colors disabled:opacity-50"
                      >
                        {verifying ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : 'Check'}
                      </button>
                    </div>
                  </div>

                  {verifyResult && <VerificationDisplay result={verifyResult} />}

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

/* ─── Create Token Flow ─── */
function CreateTokenFlow({ onCreated, onBack }: { onCreated: (data: any) => void; onBack: () => void }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    beneficiary_reddit: '',
    campaign_title: '',
    campaign_description: '',
    token_name: '',
    token_symbol: '',
    token_description: '',
    initial_buy_sol: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<'file' | 'url'>('file');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageMode('file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageMode('file');
    }
  }, []);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLaunch = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    const redditName = form.beneficiary_reddit.replace(/^u\//, '').trim();
    if (!redditName || !/^[a-zA-Z0-9_-]{3,20}$/.test(redditName)) {
      setError('Invalid Reddit username');
      return;
    }

    if (!form.token_name || !form.token_symbol) {
      setError('Token name and symbol are required');
      return;
    }

    setSubmitting(true);
    setError('');
    setStatusMsg('Uploading metadata...');

    try {
      // Step 1: Upload metadata to get URI
      let metadataUri: string;
      
      const metadataFormData = new FormData();
      metadataFormData.append('name', form.token_name);
      metadataFormData.append('symbol', form.token_symbol);
      metadataFormData.append('description', form.token_description || form.campaign_description || '');
      
      if (imageMode === 'file' && imageFile) {
        metadataFormData.append('file', imageFile);
      } else if (imageMode === 'url' && imageUrl) {
        metadataFormData.append('image_url', imageUrl);
      }

      const metaRes = await fetch('/api/upload-metadata', {
        method: 'POST',
        body: metadataFormData,
      });

      if (!metaRes.ok) {
        const metaErr = await metaRes.json();
        throw new Error(metaErr.error || 'Failed to upload metadata');
      }

      const { metadataUri: uri } = await metaRes.json();
      metadataUri = uri;
      console.log('[create] Metadata URI:', metadataUri);

      // Step 2: Build the create_v2 transaction
      setStatusMsg('Building transaction...');
      
      const buyAmount = form.initial_buy_sol ? parseFloat(form.initial_buy_sol) : undefined;
      
      const txRes = await fetch('/api/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_wallet: wallet.publicKey.toBase58(),
          token_name: form.token_name,
          token_ticker: form.token_symbol,
          token_uri: metadataUri,
          initial_buy_sol: buyAmount && buyAmount > 0 ? buyAmount : undefined,
        }),
      });

      if (!txRes.ok) {
        const txErr = await txRes.json();
        throw new Error(txErr.error || 'Failed to build transaction');
      }

      const { serialized_transaction, token_address } = await txRes.json();

      // Step 3: Deserialize and sign the transaction
      setStatusMsg('Please sign the transaction in your wallet...');
      
      const txBuffer = Buffer.from(serialized_transaction, 'base64');
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // The transaction is already partially signed by the mint keypair (server-side)
      // Now the user needs to sign it with their wallet
      const signedTx = await wallet.signTransaction(transaction);

      // Step 4: Send the transaction
      setStatusMsg('Sending transaction to Solana...');
      
      const txSignature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 5,
        preflightCommitment: 'confirmed',
      });

      console.log('[create] Transaction sent:', txSignature);
      setStatusMsg('Confirming transaction...');

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature: txSignature,
        blockhash: signedTx.message.recentBlockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('[create] Transaction confirmed!');
      setStatusMsg('Token created! Creating campaign...');

      // Step 5: Create campaign in DB
      const campaignRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_address: token_address,
          token_name: form.token_name,
          token_ticker: form.token_symbol,
          token_description: form.campaign_description || form.token_description,
          beneficiary_reddit: redditName,
          creator_wallet: wallet.publicKey.toBase58(),
          creation_method: 'created',
        }),
      });

      const campaignData = await campaignRes.json();
      if (campaignRes.ok) {
        onCreated({ 
          ...campaignData, 
          tx_signature: txSignature,
          token_address: token_address,
        });
      } else {
        // Token was created but campaign creation failed — still show success
        onCreated({
          id: 'pending',
          token_address: token_address,
          tx_signature: txSignature,
          error_note: campaignData.error || 'Campaign creation failed, but token was created successfully.',
        });
      }
    } catch (err: any) {
      console.error('[create] Error:', err);
      if (err.message?.includes('User rejected')) {
        setError('Transaction was rejected by your wallet.');
      } else {
        setError(err.message || 'Failed to create token');
      }
    }
    setSubmitting(false);
    setStatusMsg('');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-white mb-6 flex items-center gap-1">
        ← Back to options
      </button>
      <h1 className="text-3xl font-bold mb-2">Create New Token</h1>
      <p className="text-gray-400 mb-10">
        Launch a real pump.fun token on Solana. You&apos;ll sign the transaction with your wallet.
      </p>

      <div className="space-y-6">

        {/* Token Details */}
        <div className="rounded-xl border border-[#222] bg-[#141414] p-6">
          <h2 className="text-lg font-bold text-white mb-1">Token Details</h2>
          <p className="text-sm text-gray-500 mb-5">Configure your new pump.fun token.</p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Token Name *</label>
                <input
                  type="text"
                  placeholder="e.g. GrantCoin"
                  value={form.token_name}
                  onChange={e => setForm(f => ({ ...f, token_name: e.target.value }))}
                  className="w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symbol *</label>
                <input
                  type="text"
                  placeholder="e.g. GRANT"
                  value={form.token_symbol}
                  onChange={e => setForm(f => ({ ...f, token_symbol: e.target.value.toUpperCase() }))}
                  maxLength={10}
                  className="w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                placeholder="What is this token about?"
                value={form.token_description}
                onChange={e => setForm(f => ({ ...f, token_description: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition-colors resize-none"
              />
            </div>

            {/* Image Upload / URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Token Image <span className="text-gray-600">(optional)</span></label>
              
              {/* Mode toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setImageMode('file')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    imageMode === 'file'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : 'bg-[#1a1a1a] text-gray-500 border border-[#222] hover:text-gray-300'
                  }`}
                >
                  <Upload className="h-3 w-3" /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    imageMode === 'url'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : 'bg-[#1a1a1a] text-gray-500 border border-[#222] hover:text-gray-300'
                  }`}
                >
                  <Link2 className="h-3 w-3" /> Paste URL
                </button>
              </div>

              {imageMode === 'file' ? (
                <div>
                  {imagePreview && imageFile ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Token preview"
                        className="h-24 w-24 rounded-xl object-cover border border-[#333]"
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
                        dragOver
                          ? 'border-orange-500/60 bg-orange-500/5'
                          : 'border-[#333] bg-[#0e0e0e] hover:border-[#444] hover:bg-[#111]'
                      }`}
                    >
                      <ImageIcon className="h-8 w-8 text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500">Drop image here or click to select</p>
                      <p className="text-xs text-gray-600 mt-1">PNG, JPG, GIF, WebP</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    placeholder="https://example.com/image.png"
                    value={imageUrl}
                    onChange={e => {
                      setImageUrl(e.target.value);
                      if (e.target.value) setImagePreview(e.target.value);
                    }}
                    className="w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition-colors font-mono text-xs"
                  />
                  {imageUrl && (
                    <div className="mt-3 relative inline-block">
                      <img
                        src={imageUrl}
                        alt="Token preview"
                        className="h-24 w-24 rounded-xl object-cover border border-[#333]"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Initial Buy */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Initial Buy Amount <span className="text-gray-600">(optional)</span>
              </label>
              <div className="flex items-center rounded-xl border border-[#222] bg-[#0e0e0e] overflow-hidden focus-within:border-orange-500/50 transition-colors">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.00"
                  value={form.initial_buy_sol}
                  onChange={e => setForm(f => ({ ...f, initial_buy_sol: e.target.value }))}
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-gray-600 outline-none"
                />
                <span className="px-4 text-sm text-gray-500 bg-[#0a0a0a] py-3 border-l border-[#222] font-medium">SOL</span>
              </div>
              <p className="text-xs text-gray-600 mt-1.5">
                Buy tokens right after creation. This costs additional SOL + gas. Leave empty for no initial buy.
              </p>
            </div>
          </div>
        </div>

        {/* Beneficiary */}
        <div className="rounded-xl border border-[#222] bg-[#141414] p-6">
          <h2 className="text-lg font-bold text-white mb-1">Grant Recipient</h2>
          <p className="text-sm text-gray-500 mb-5">Who will receive the trading fees?</p>

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
                className="w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Fee Sharing Note */}
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-400">Fee Sharing — Set Up After Creation</p>
              <p className="text-xs text-gray-400 mt-1">
                After your token is created, you&apos;ll need to set up fee sharing on pump.fun.
                Go to your token&apos;s page → &ldquo;Share creator rewards&rdquo; → paste PumpGrant&apos;s wallet → 100% → Save.
              </p>
              <div className="mt-2 rounded-lg bg-[#0a0a0a] border border-amber-500/20 px-3 py-2">
                <p className="text-xs text-gray-500">PumpGrant wallet to paste:</p>
                <code className="text-xs text-amber-400 font-mono break-all">{PLATFORM_WALLET}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Wallet & Launch */}
        <div className="rounded-xl border border-[#222] bg-[#141414] p-6">
          <h2 className="text-lg font-bold text-white mb-4">Connect & Launch</h2>

          <div className="flex items-center gap-4 mb-6">
            <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 !rounded-xl !py-3 !text-sm !font-bold" />
            {wallet.publicKey && (
              <p className="text-xs text-green-400">
                ✓ Connected: {wallet.publicKey.toBase58().slice(0, 8)}...
              </p>
            )}
          </div>

          {statusMsg && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm text-blue-400 flex items-center gap-2 mb-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-start gap-2 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleLaunch}
            disabled={submitting || !wallet.publicKey}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-4 text-base font-bold text-white hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {statusMsg || 'Processing...'}
              </>
            ) : (
              <>
                🚀 Create Token on pump.fun
              </>
            )}
          </button>

          <p className="text-xs text-gray-600 text-center mt-3">
            You&apos;ll sign a real Solana transaction. This creates the token on-chain via pump.fun&apos;s program.
            {form.initial_buy_sol && parseFloat(form.initial_buy_sol) > 0 && (
              <span className="block mt-1 text-amber-500">
                + Initial buy of {form.initial_buy_sol} SOL will be included.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Verification Display ─── */
function VerificationDisplay({ result }: { result: any }) {
  if (!result) return null;

  const hasConfig = result.config_exists;
  const isValid = result.valid;
  const isLocked = result.is_locked;
  const shareholders = result.shareholders || [];

  return (
    <div className="space-y-3">
      <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
        isValid
          ? 'bg-green-500/10 border border-green-500/20'
          : hasConfig
            ? 'bg-red-500/10 border border-red-500/20'
            : 'bg-amber-500/10 border border-amber-500/20'
      }`}>
        <span className="text-lg shrink-0">
          {isValid ? '✅' : hasConfig ? '❌' : '⏳'}
        </span>
        <div>
          <p className={`text-sm font-semibold ${
            isValid ? 'text-green-400' : hasConfig ? 'text-red-400' : 'text-amber-400'
          }`}>
            {isValid
              ? 'Verified on-chain — PumpGrant wallet is a shareholder'
              : hasConfig
                ? 'Fee sharing exists but PumpGrant wallet is not a shareholder'
                : 'No fee sharing config found yet'}
          </p>
          {result.token_name && result.token_name !== 'Unknown' && (
            <p className="text-xs text-gray-500 mt-0.5">
              Token: {result.token_name} (${result.token_symbol})
            </p>
          )}
        </div>
      </div>

      {hasConfig && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 ${
          isLocked
            ? 'bg-green-500/5 border border-green-500/10'
            : 'bg-amber-500/5 border border-amber-500/10'
        }`}>
          {isLocked ? (
            <Lock className="h-4 w-4 text-green-400" />
          ) : (
            <Unlock className="h-4 w-4 text-amber-400" />
          )}
          <span className={`text-xs ${isLocked ? 'text-green-400' : 'text-amber-400'}`}>
            {isLocked
              ? '🔒 Config is locked — Cannot be changed'
              : '⚠️ Config is still editable — Creator can change it'}
          </span>
        </div>
      )}

      {shareholders.length > 0 && (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-400">On-Chain Shareholders</p>
          </div>
          <div className="space-y-2">
            {shareholders.map((sh: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-[#141414] px-3 py-2">
                <code className="text-xs text-purple-400 font-mono">
                  {sh.address === PLATFORM_WALLET
                    ? '🏆 PumpGrant Wallet'
                    : `${sh.address.slice(0, 8)}...${sh.address.slice(-6)}`}
                </code>
                <span className={`text-xs font-bold ${
                  sh.address === PLATFORM_WALLET ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {sh.percentage}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
function SubStep({ num, text }: { num: number; text: string }) {
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
  const [copied, setCopied] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const verifyResult = data.verify_result;
  const isVerified = verifyResult?.valid;
  const isLocked = verifyResult?.is_locked;
  const txSignature = data.tx_signature;
  const tokenAddress = data.token_address;

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPlatformWallet = () => {
    navigator.clipboard.writeText(PLATFORM_WALLET);
    setWalletCopied(true);
    setTimeout(() => setWalletCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <div className="rounded-2xl border border-green-500/20 bg-[#141414] p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mx-auto mb-4">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {txSignature ? 'Token Created on pump.fun! 🎉' : 'Campaign Created!'}
        </h1>
        <p className={`text-sm font-medium mb-2 ${
          isVerified ? 'text-green-400' : txSignature ? 'text-green-400' : 'text-amber-400'
        }`}>
          {txSignature 
            ? '✅ Token is live on Solana'
            : isVerified ? '✅ Verified on-chain' : '⏳ Pending verification'}
          {isLocked && ' 🔒'}
        </p>

        <div className="space-y-3 text-left mb-6 mt-6">
          <div className="rounded-xl bg-[#0a0a0a] border border-[#222] p-4">
            <p className="text-xs text-gray-500 mb-1">Token Address (CA)</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm text-purple-400 font-mono break-all">{tokenAddress}</code>
              <button
                onClick={copyAddress}
                className="text-gray-500 hover:text-white ml-2 shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {txSignature && (
            <div className="rounded-xl bg-[#0a0a0a] border border-[#222] p-4">
              <p className="text-xs text-gray-500 mb-1">Transaction</p>
              <a
                href={`https://solscan.io/tx/${txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 font-mono break-all flex items-center gap-1"
              >
                {txSignature.slice(0, 20)}...{txSignature.slice(-8)}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}

          {/* Fee sharing setup instructions */}
          {txSignature && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
              <p className="text-sm font-semibold text-amber-400 mb-2">⚡ Next Step: Set Up Fee Sharing</p>
              <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
                <li>
                  Go to{' '}
                  <a
                    href={`https://pump.fun/coin/${tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline"
                  >
                    your token on pump.fun
                  </a>
                </li>
                <li>Click &ldquo;Share creator rewards&rdquo;</li>
                <li>
                  Paste PumpGrant wallet:{' '}
                  <button onClick={copyPlatformWallet} className="inline text-amber-400 hover:underline font-mono">
                    {walletCopied ? '✓ Copied!' : `${PLATFORM_WALLET.slice(0, 12)}...`}
                  </button>
                </li>
                <li>Set to <strong className="text-white">100%</strong> → Save</li>
              </ol>
            </div>
          )}

          {verifyResult?.shareholders?.length > 0 && (
            <div className="rounded-xl bg-[#0a0a0a] border border-[#222] p-4">
              <p className="text-xs text-gray-500 mb-2">Fee Shareholders (on-chain)</p>
              {verifyResult.shareholders.map((sh: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <code className="text-xs text-purple-400 font-mono">
                    {sh.address.slice(0, 12)}...{sh.address.slice(-6)}
                  </code>
                  <span className="text-xs font-bold text-green-400">{sh.percentage}</span>
                </div>
              ))}
            </div>
          )}

          {data.error_note && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
              <p className="text-xs text-amber-400">{data.error_note}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {tokenAddress && (
            <a
              href={`https://pump.fun/coin/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              View on pump.fun
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {data.id && data.id !== 'pending' && (
            <Link
              href={`/campaign/${data.id}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              View Campaign
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
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
