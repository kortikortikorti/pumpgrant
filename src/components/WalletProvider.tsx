'use client';

import { useMemo, useState, useEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

// Lazy load wallet adapter to prevent SSR crashes
function WalletProviderInner({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const wallets = useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const { PhantomWalletAdapter } = require('@solana/wallet-adapter-phantom');
      const { SolflareWalletAdapter } = require('@solana/wallet-adapter-solflare');
      return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
    } catch {
      return [];
    }
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  try {
    const { ConnectionProvider, WalletProvider: SolanaWalletProvider } = require('@solana/wallet-adapter-react');
    const { WalletModalProvider } = require('@solana/wallet-adapter-react-ui');
    require('@solana/wallet-adapter-react-ui/styles.css');

    return (
      <ConnectionProvider endpoint={RPC_ENDPOINT}>
        <SolanaWalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </SolanaWalletProvider>
      </ConnectionProvider>
    );
  } catch (e) {
    console.error('Wallet adapter failed to load:', e);
    return <>{children}</>;
  }
}

export default function WalletProvider({ children }: { children: ReactNode }) {
  return <WalletProviderInner>{children}</WalletProviderInner>;
}
