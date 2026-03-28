'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function WalletDisplay({ address, label }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500">{label}</span>}
      <div className="flex items-center gap-2 rounded-lg bg-[#0a0a0a] border border-[#222] px-3 py-2">
        <code className="text-sm text-purple-400 font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </code>
        <button
          onClick={handleCopy}
          className="text-gray-500 hover:text-white transition-colors"
          title="Copy address"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
