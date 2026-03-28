'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface FeeEvent {
  id: string;
  amount_sol: number;
  tx_signature: string;
  event_type: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'just now';
}

export default function FeeTimeline({ events }: { events: FeeEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">
        No fee events yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-4 py-3 hover:border-[#222] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
              event.event_type === 'trade_fee'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-purple-500/10 text-purple-400'
            }`}>
              {event.event_type === 'trade_fee' ? (
                <ArrowDownRight className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm text-white font-medium">
                {event.event_type === 'trade_fee' ? 'Trade Fee' : event.event_type}
              </p>
              <a
                href={`https://solscan.io/tx/${event.tx_signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 font-mono hover:text-purple-400 transition-colors"
              >
                {event.tx_signature.slice(0, 12)}...
              </a>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-green-400">+{event.amount_sol.toFixed(3)} SOL</p>
            <p className="text-xs text-gray-600">{timeAgo(event.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
