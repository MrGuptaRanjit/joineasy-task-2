import React from 'react';

export default function ProgressBar({ value = 0, max = 100, label, showPercentage = true, color = 'indigo' }) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100) || 0));

  const colorVariants = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-purple-500 to-indigo-500',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-400 mb-1.5">
          <span>{label}</span>
          {showPercentage && <span className="font-semibold text-slate-200">{percentage}%</span>}
        </div>
      )}
      <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorVariants[color] || colorVariants.indigo} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
