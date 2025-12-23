
import React from 'react';
import { BakingRight } from '../types';

interface BakingRightCellProps {
  right: BakingRight;
}

const BakingRightCell: React.FC<BakingRightCellProps> = ({ right }) => {
  const date = new Date(right.timestamp);
  
  // Format: "Mar 12, 14:30:05"
  const formattedDateTime = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;

  const isRound0 = right.round === 0;

  return (
    <div className={`flex items-center justify-between py-1 px-2 rounded border border-transparent transition-all group ${
      isRound0 
        ? 'bg-blue-900/10 border-blue-900/20 hover:bg-blue-900/20' 
        : 'hover:bg-zinc-900/60 hover:border-zinc-800/50 opacity-60 hover:opacity-100'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-mono tabular-nums ${isRound0 ? 'text-blue-400' : 'text-zinc-400'}`}>
          {right.level.toLocaleString()}
        </span>
        {!isRound0 && (
          <span className="text-[8px] font-bold px-1 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
            R1
          </span>
        )}
      </div>
      <span className={`text-[10px] font-mono transition-colors ${
        isRound0 ? 'text-blue-400/80 group-hover:text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'
      }`}>
        {formattedDateTime}
      </span>
    </div>
  );
};

export default BakingRightCell;
