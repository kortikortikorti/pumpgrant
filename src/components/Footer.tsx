import { Zap } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#222] bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF4500] to-[#FF6B35]">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">PumpGrant</span>
            </div>
            <p className="text-sm text-gray-500 max-w-sm">
              Fund any Redditor through pump.fun token trading fees. Launch a token, lock the fees permanently, and let them claim.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Platform</h3>
            <div className="space-y-2">
              <Link href="/create" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Create Grant</Link>
              <Link href="/claim" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Claim Funds</Link>
              <Link href="/dashboard" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Dashboard</Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Resources</h3>
            <div className="space-y-2">
              <Link href="/about" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">How It Works</Link>
              <a href="https://pump.fun" target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">pump.fun</a>
              <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">Solana</a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-[#222] text-center text-sm text-gray-600">
          © 2026 PumpGrant. Built on Solana. Powered by pump.fun.
        </div>
      </div>
    </footer>
  );
}
