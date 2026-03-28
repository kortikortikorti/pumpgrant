interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  color?: 'orange' | 'purple' | 'green' | 'blue';
}

const colorMap = {
  orange: 'from-[#FF4500]/10 to-[#FF6B35]/10 text-[#FF4500]',
  purple: 'from-purple-500/10 to-purple-600/10 text-purple-400',
  green: 'from-green-500/10 to-green-600/10 text-green-400',
  blue: 'from-blue-500/10 to-blue-600/10 text-blue-400',
};

export default function StatsCard({ label, value, subtext, icon, color = 'orange' }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-[#222] bg-[#141414] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}
