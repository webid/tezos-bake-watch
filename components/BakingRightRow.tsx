
import React from 'react';
import { BakingRight } from '../types';

interface BakingRightCellProps {
  right: BakingRight;
}

const BakingRightCell: React.FC<BakingRightCellProps> = ({ right }) => {
  const date = new Date(right.timestamp);
  
  // Format: "Mar 12, 14:30:05"
  const formattedDateTime = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;

  return (
    <div className="flex items-center justify-between py-1 px-2 hover:bg-zinc-900/60 rounded border border-transparent hover:border-zinc-800/50 transition-all group">
      <span className="text-[11px] font-mono text-zinc-300 tabular-nums">
        {right.level.toLocaleString()}
      </span>
      <span className="text-[10px] text-zinc-500 font-mono group-hover:text-zinc-400 transition-colors">
        {formattedDateTime}
      </span>
    </div>
  );
};

export default BakingRightCell;
