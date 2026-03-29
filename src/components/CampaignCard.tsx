'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import RedditBadge from './RedditBadge';

interface Campaign {
  id: string;
  token_name: string;
  token_ticker: string;
  token_address: string;
  token_image_url: string | null;
  beneficiary_reddit: string;
  total_fees_accumulated: number;
  total_fees_claimed: number;
  status: string;
}

export default function CampaignCard({ campaign }: { campaign: Campaign }) {
  const available = campaign.total_fees_accumulated - campaign.total_fees_claimed;

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <div className="group relative overflow-hidden rounded-xl border border-[#222] bg-[#141414] p-5 transition-all duration-300 hover:border-[#FF4500]/30 hover:bg-[#1a1a1a] hover:shadow-lg hover:shadow-[#FF4500]/5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {campaign.token_image_url ? (
              <img
                src={campaign.token_image_url}
                alt={campaign.token_name}
                className="h-10 w-10 rounded-lg bg-[#222]"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-purple-400 font-bold text-sm">
                {campaign.token_ticker.slice(0, 2)}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-white group-hover:text-[#FF4500] transition-colors">
                {campaign.token_name}
              </h3>
              <span className="text-xs text-gray-500 font-mono">${campaign.token_ticker}</span>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-gray-600 group-hover:text-[#FF4500] transition-colors" />
        </div>

        <RedditBadge username={campaign.beneficiary_reddit} />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#0a0a0a] p-3">
            <p className="text-xs text-gray-500 mb-1">Accumulated</p>
            <p className="text-sm font-semibold text-white">
              {campaign.total_fees_accumulated.toFixed(3)} <span className="text-purple-400">SOL</span>
            </p>
          </div>
          <div className="rounded-lg bg-[#0a0a0a] p-3">
            <p className="text-xs text-gray-500 mb-1">Available</p>
            <p className="text-sm font-semibold text-green-400">
              {available.toFixed(3)} <span className="text-green-400/60">SOL</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          {campaign.status === 'pending' ? (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-xs text-amber-500">Pending</span>
            </div>
          ) : (campaign.status === 'verified' || campaign.status === 'active') ? (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-500">Verified</span>
            </div>
          ) : (
            <div />
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`https://pump.fun/coin/${campaign.token_address}`, '_blank'); }}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            pump.fun
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Link>
  );
}
