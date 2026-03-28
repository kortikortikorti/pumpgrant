'use client';

import { useState } from 'react';
import { Loader2, Check, ArrowDown } from 'lucide-react';

interface Props {
  campaignId: string;
  available: number;
  redditUsername: string;
  walletAddress: string;
  onClaimed?: () => void;
}

export default function ClaimButton({ campaignId, available, redditUsername, walletAddress, onClaimed }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleClaim = async () => {
    if (available <= 0) return;
    setState('loading');

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          reddit_username: redditUsername,
          wallet_address: walletAddress,
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

  return (
    <button
      onClick={handleClaim}
      disabled={available <= 0 || state === 'loading'}
      className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
        available <= 0
          ? 'bg-[#222] text-gray-600 cursor-not-allowed'
          : state === 'loading'
          ? 'bg-[#FF4500]/50 text-white cursor-wait'
          : 'bg-gradient-to-r from-[#FF4500] to-[#FF6B35] text-white hover:opacity-90 hover:shadow-lg hover:shadow-[#FF4500]/20'
      }`}
    >
      {state === 'loading' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Claiming...
        </>
      ) : (
        <>
          <ArrowDown className="h-4 w-4" />
          {available > 0 ? `Claim ${available.toFixed(3)} SOL` : 'Nothing to Claim'}
        </>
      )}
    </button>
  );
}
