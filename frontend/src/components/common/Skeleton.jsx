import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-800/80 rounded-xl ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4 border border-slate-800">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="pt-2">
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

export default Skeleton;
