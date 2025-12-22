
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Baker } from '../types';

interface BakerSelectorProps {
  bakers: Baker[];
  selectedBaker: Baker | null;
  onSelect: (baker: Baker) => void;
}

const BakerSelector: React.FC<BakerSelectorProps> = ({ bakers, selectedBaker, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredBakers = useMemo(() => {
    if (!search) return bakers.slice(0, 50); // Limit initial view
    const lowerSearch = search.toLowerCase();
    return bakers
      .filter(b => 
        (b.name && b.name.toLowerCase().includes(lowerSearch)) || 
        b.address.toLowerCase().includes(lowerSearch)
      )
      .slice(0, 50); // Limit results for performance
  }, [bakers, search]);

  const handleSelect = (baker: Baker) => {
    onSelect(baker);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded px-2 py-1 transition-colors group"
      >
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white leading-none">
            {selectedBaker?.name || 'Unknown Baker'}
          </span>
          <span className="text-[8px] font-mono text-zinc-500 leading-none mt-0.5">
            {selectedBaker?.address ? `${selectedBaker.address.slice(0, 5)}...${selectedBaker.address.slice(-5)}` : 'Select Baker'}
          </span>
        </div>
        <svg className={`w-3 h-3 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-zinc-900 bg-zinc-900/30">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search name or address..."
              className="w-full bg-zinc-900 text-zinc-200 text-xs px-2 py-1.5 rounded border border-zinc-800 focus:outline-none focus:border-blue-500/50 placeholder-zinc-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {filteredBakers.length === 0 ? (
              <div className="p-3 text-center text-[10px] text-zinc-600">No bakers found</div>
            ) : (
              filteredBakers.map(baker => (
                <button
                  key={baker.address}
                  onClick={() => handleSelect(baker)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-900 flex flex-col gap-0.5 border-b border-zinc-900/50 last:border-0 ${
                    selectedBaker?.address === baker.address ? 'bg-blue-500/10' : ''
                  }`}
                >
                  <span className={`font-medium ${selectedBaker?.address === baker.address ? 'text-blue-400' : 'text-zinc-300'}`}>
                    {baker.name || 'Unknown'}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-600 truncate w-full">
                    {baker.address}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BakerSelector;
