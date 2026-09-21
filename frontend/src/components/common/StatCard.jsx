import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo', badge }) {
  const colorStyles = {
    indigo: {
      bg: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400',
      iconBg: 'bg-indigo-500/20 text-indigo-300'
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
      iconBg: 'bg-emerald-500/20 text-emerald-300'
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400',
      iconBg: 'bg-amber-500/20 text-amber-300'
    },
    rose: {
      bg: 'from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400',
      iconBg: 'bg-rose-500/20 text-rose-300'
    },
    cyan: {
      bg: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400',
      iconBg: 'bg-cyan-500/20 text-cyan-300'
    }
  };

  const currentStyle = colorStyles[color] || colorStyles.indigo;

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border bg-gradient-to-br ${currentStyle.bg} glass-card-hover`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${currentStyle.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
        {badge && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}
