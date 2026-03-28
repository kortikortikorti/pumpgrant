'use client';

import { useState } from 'react';
import { X, AlertTriangle, Eye, Download, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export default function PrivateKeyModal({ isOpen, onClose, walletAddress }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [privateKey, setPrivateKey] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchPrivateKey = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo_user' }),
      });
      const data = await res.json();
      if (data.private_key) {
        setPrivateKey(data.private_key);
      }
    } catch (err) {
      console.error('Failed to fetch key:', err);
    }
    setLoading(false);
  };

  const handleExport = () => {
    if (!privateKey) return;
    const blob = new Blob([JSON.stringify(privateKey)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pumpgrant-wallet-${walletAddress.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!privateKey) return;
    navigator.clipboard.writeText(JSON.stringify(privateKey));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#222] bg-[#141414] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Private Key</h3>
          <button onClick={() => { onClose(); setConfirmed(false); setPrivateKey(null); }} className="text-gray-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!confirmed ? (
          <div>
            <div className="flex items-start gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-500 mb-1">Warning — Read Carefully</p>
                <p className="text-xs text-yellow-500/80">
                  Your private key gives full access to this wallet. Anyone who has it can take your funds. 
                  Save it somewhere safe. <strong>If you lose it, we cannot recover your funds.</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => { setConfirmed(true); fetchPrivateKey(); }}
              className="w-full rounded-xl bg-yellow-500/20 border border-yellow-500/30 py-3 text-sm font-medium text-yellow-500 hover:bg-yellow-500/30 transition-colors"
            >
              I understand, show my private key
            </button>
          </div>
        ) : (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF4500] border-t-transparent" />
              </div>
            ) : privateKey ? (
              <>
                <div className="rounded-xl bg-[#0a0a0a] border border-[#222] p-4 mb-4 max-h-32 overflow-auto">
                  <code className="text-xs text-gray-400 break-all font-mono">
                    [{privateKey.slice(0, 8).join(', ')}...{privateKey.slice(-4).join(', ')}]
                  </code>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#222] py-3 text-sm font-medium text-white hover:bg-[#333] transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Key'}
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF4500] to-[#FF6B35] py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                    Export .json
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-red-400 text-center py-4">Failed to load private key</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
