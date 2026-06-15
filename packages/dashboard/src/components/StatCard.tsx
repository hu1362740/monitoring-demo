import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'red' | 'purple';
  change?: number;
  changeLabel?: string;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600'
};

const iconBgClasses = {
  blue: 'bg-blue-100',
  green: 'bg-emerald-100',
  red: 'bg-red-100',
  purple: 'bg-purple-100'
};

export default function StatCard({ title, value, icon, color = 'blue', change, changeLabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
          <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-3">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                change >= 0 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
              </span>
              <span className="text-xs text-slate-400">{changeLabel}</span>
            </div>
          )}
        </div>
        <div className={`p-3.5 rounded-xl ${iconBgClasses[color]} ${colorClasses[color]} flex-shrink-0 ml-4 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  );
}