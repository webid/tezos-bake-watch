
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from './components/Layout';
import BakingRightCell from './components/BakingRightRow';
import BakerSelector from './components/BakerSelector';
import { tzktService } from './services/tzktService';
import { bakingBadService } from './services/bakingBadService';
import { BakingRight, Baker, Cycle } from './types';

const DEFAULT_BAKER_ADDRESS = 'tz1T1fRJmpPp1pN2z45sivxdbKNQtyatzCVx';

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '--';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m ${seconds % 60}s`;
};

const App: React.FC = () => {
  const [bakers, setBakers] = useState<Baker[]>([]);
  const [selectedBaker, setSelectedBaker] = useState<Baker | null>(null);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(() => {
    const saved = localStorage.getItem('isMetricsExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showRound1, setShowRound1] = useState(() => {
    const saved = localStorage.getItem('showRound1');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('isMetricsExpanded', JSON.stringify(isMetricsExpanded));
  }, [isMetricsExpanded]);

  useEffect(() => {
    localStorage.setItem('showRound1', JSON.stringify(showRound1));
  }, [showRound1]);

  const [cycles, setCycles] = useState<Record<number, Cycle>>({});
  
  const [allRights, setAllRights] = useState<BakingRight[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [bakerStats, setBakerStats] = useState<import('./types').BakerExtendedStats | null>(null);
  const [pastRights, setPastRights] = useState<BakingRight[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  // Load bakers and cycles on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Load Cycles
      try {
        const cyclesList = await tzktService.getCycles();
        const cyclesMap = cyclesList.reduce((acc, c) => ({...acc, [c.index]: c}), {} as Record<number, Cycle>);
        setCycles(cyclesMap);
      } catch (err) {
        console.error('Failed to load cycles', err);
      }

      // Load Bakers
      try {
        const data = await bakingBadService.getBakers();
        setBakers(data);

        // Resolve initial baker from URL Hash or local storage
        const hash = window.location.hash.slice(1); // remove '#'
        const urlAddress = /^(tz[1-3]|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(hash) ? hash : null;
        
        let addressToUse = localStorage.getItem('selectedBakerAddress') || DEFAULT_BAKER_ADDRESS;
        
        if (urlAddress) {
          const exists = data.some(b => b.address === urlAddress);
          if (exists) {
            addressToUse = urlAddress;
          } else {
             // Clear invalid hash
             window.history.replaceState(null, '', ' ');
          }
        } else if (window.location.hash) {
            // Clear invalid hash format if present
             window.history.replaceState(null, '', ' ');
        }

        const found = data.find(b => b.address === addressToUse);
        
        if (found) {
          setSelectedBaker(found);
          if (urlAddress && found.address === urlAddress) {
             localStorage.setItem('selectedBakerAddress', found.address);
          }
        } else {
          // Fallback object if not found in list yet or custom/private baker
          setSelectedBaker({
            address: addressToUse,
            name: 'Unknown Baker',
            status: 'active',
            balance: 0,
            delegation: { enabled: false, minBalance: 0, fee: 0, capacity: 0, freeSpace: 0, estimatedApy: 0 },
            staking: { enabled: false, minBalance: 0, fee: 0, capacity: 0, freeSpace: 0, estimatedApy: 0 }
          });
        }
      } catch (err) {
        console.error('Failed to load bakers', err);
        // Ensure we have a selected baker even if API fails
        if (!selectedBaker) {
             const savedAddress = localStorage.getItem('selectedBakerAddress') || DEFAULT_BAKER_ADDRESS;
             setSelectedBaker({
                address: savedAddress,
                name: 'Baker',
                status: 'unknown',
                balance: 0,
                delegation: { enabled: false, minBalance: 0, fee: 0, capacity: 0, freeSpace: 0, estimatedApy: 0 },
                staking: { enabled: false, minBalance: 0, fee: 0, capacity: 0, freeSpace: 0, estimatedApy: 0 }
             });
        }
      }
    };
    loadInitialData();
  }, []);

  const handleBakerSelect = (baker: Baker) => {
    setSelectedBaker(baker);
    localStorage.setItem('selectedBakerAddress', baker.address);
    window.location.hash = baker.address;
    // Reset data immediately to show loading state for new baker
    setAllRights([]);
    setPastRights([]); // Clear history
    setIsLoading(true);
    setIsLoadingHistory(true); // Set history loading
  };

  // Timer for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data function extended
  const fetchData = useCallback(async () => {
    if (!selectedBaker) return;

    setIsLoading(true);
    setError(null);

    // Fetch past baking rights independently so it's not blocked by main data failures
    setIsLoadingHistory(true);
    tzktService.getPastBakingRights(selectedBaker.address)
      .then(rights => setPastRights(rights))
      .catch(console.error)
      .finally(() => setIsLoadingHistory(false));

    try {
      const level = await tzktService.getHeadLevel();
      setCurrentLevel(level);

      // Parallel fetch for rights and account stats
      const [rightsData, statsData] = await Promise.all([
        tzktService.getBakingRights(level, selectedBaker.address),
        tzktService.getAccount(selectedBaker.address)
      ]);
      
      setAllRights(rightsData);
      setBakerStats(statsData);



    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBaker]);

  // Initial fetch and polling
  useEffect(() => {
    if (selectedBaker) {
        fetchData();
        const interval = setInterval(fetchData, 24000);
        return () => clearInterval(interval);
    }
  }, [fetchData, selectedBaker]);

  // Derived state
  const bakingRights = useMemo(() => {
    return allRights.filter(r => r.type === 'baking' && (showRound1 ? r.round <= 1 : r.round === 0));
  }, [allRights, showRound1]);
  
  const nextBlockRight = bakingRights[0];
  const lastRight = allRights[allRights.length - 1];

  const timeToNextBlock = nextBlockRight 
    ? new Date(nextBlockRight.timestamp).getTime() - now 
    : 0;

  const lastCycleIndex = bakingRights.length > 0 ? bakingRights[bakingRights.length - 1].cycle : undefined;
  const lastCycleData = lastCycleIndex ? cycles[lastCycleIndex] : undefined;
    
  const dataCoverageInterval = lastCycleData
    ? new Date(lastCycleData.endTime).getTime() - now
    : (lastRight ? new Date(lastRight.timestamp).getTime() - now : 0);

  // Group rights by cycle
  const groupedByCycle = useMemo(() => {
    const groups: Record<number, BakingRight[]> = {};
    bakingRights.forEach(right => {
      if (!groups[right.cycle]) {
        groups[right.cycle] = [];
      }
      groups[right.cycle].push(right);
    });
    return groups;
  }, [bakingRights]);

  const renderBakerInfo = () => {
    if (!selectedBaker || selectedBaker.name === 'Unknown Baker') return null;
    
    const formatValue = (val: number) => Math.floor(val).toLocaleString();
    const formatPercent = (val: number) => (val * 100).toFixed(2) + '%';
    
    // Helper to render a data section (Delegation or Staking)
    const renderDataSection = (title: string, data: any, extraMetrics?: React.ReactNode) => {
       const used = data.capacity - data.freeSpace;
       const isOverCapacity = data.freeSpace < 0;
       const percentage = data.capacity > 0 ? (used / data.capacity) * 100 : 0;
       
       return (
       <div className="flex flex-col gap-3">
         <div className="flex items-center gap-2 pb-1 border-b border-zinc-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</h3>
            {data.enabled ? 
              <span className="flex items-center gap-1 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-900/30">
                 <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                 <span className="text-[8px] font-bold text-green-500 uppercase">Active</span>
              </span> : 
              <span className="flex items-center gap-1 bg-red-900/20 px-1.5 py-0.5 rounded border border-red-900/30">
                 <span className="w-1 h-1 rounded-full bg-red-500"></span>
                 <span className="text-[8px] font-bold text-red-500 uppercase">Disabled</span>
              </span>
            }
         </div>
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-2">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-600 uppercase mb-0.5">Fee</span>
              <span className="text-xs font-mono text-zinc-300">{formatPercent(data.fee)}</span>
            </div>
             <div className="flex flex-col">
              <span className="text-[9px] text-zinc-600 uppercase mb-0.5">APY</span>
              <span className="text-xs font-mono text-green-400 font-bold">{formatPercent(data.estimatedApy)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-600 uppercase mb-0.5">Free Space</span>
              <span className={`text-xs font-mono tabular-nums ${isOverCapacity ? 'text-red-400 font-bold' : 'text-zinc-300'}`}>
                {formatValue(data.freeSpace)} ꜩ
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-600 uppercase mb-0.5">Capacity</span>
              <span className="text-xs font-mono text-zinc-400 tabular-nums">{formatValue(data.capacity)} ꜩ</span>
            </div>
             {data.minBalance > 0 && (
              <div className="flex flex-col sm:col-span-2 mt-1">
                <span className="text-[9px] text-zinc-600 uppercase mb-0.5">Minimum</span>
                <span className="text-xs font-mono text-zinc-300 tabular-nums">{formatValue(data.minBalance)} ꜩ</span>
              </div>
            )}
            {extraMetrics}
         </div>
         {/* Progress Bar */}
         <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                  isOverCapacity ? 'bg-red-500' : 
                  data.enabled ? 'bg-zinc-500' : 'bg-zinc-700'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
         </div>
       </div>
    );
    };

    return (
      <div className="flex flex-col gap-4 mb-6 p-4 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
        <div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-900/50 pb-4 cursor-pointer select-none group gap-4 sm:gap-0"
          onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
        >
             <div className="flex items-center gap-3 w-full sm:w-auto">
                 <button 
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                    aria-label={isMetricsExpanded ? "Collapse metrics" : "Expand metrics"}
                 >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className={`w-4 h-4 transition-transform duration-300 ${isMetricsExpanded ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                 </button>
                 {selectedBaker.logo && <img src={selectedBaker.logo} alt="" className="w-10 h-10 rounded-full bg-zinc-800 object-cover border border-zinc-800 shrink-0" />}
                 <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-zinc-200 truncate">{selectedBaker.name}</h2>
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsBlockModalOpen(true); }}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="View Recent Baking History"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                          </svg>
                      </button>
                      <a 
                        href={`https://bafo.fafolab.xyz/?address=${selectedBaker.address}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[9px] font-black text-blue-500/50 hover:text-blue-400 transition-colors uppercase tracking-wider shrink-0 border border-blue-500/20 hover:border-blue-500/50 px-1.5 py-0.5 rounded cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        title="View performance analysis and insights at B.A.F.O."
                      >
                        B.A.F.O.
                      </a>
                    </div>
                    <a 
                      href={`https://tzkt.io/${selectedBaker.address}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors hover:underline break-all block mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selectedBaker.address}
                    </a>
                 </div>
             </div>
              <div className="hidden sm:flex flex-col items-end justify-between w-auto mt-0 pl-0">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 whitespace-nowrap">Own Stake</span>
                  <span className="text-sm font-mono text-blue-400 font-bold tabular-nums text-right">
                    {formatValue(bakerStats ? bakerStats.stakedBalance / 1000000 : selectedBaker.balance)} ꜩ
                    <span className="block text-[9px] text-zinc-600 font-normal mt-0.5">
                       Total: {formatValue(bakerStats ? bakerStats.balance / 1000000 : selectedBaker.balance)} ꜩ
                    </span>
                  </span>
              </div>
        </div>

        {isMetricsExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-in slide-in-from-top-2 fade-in duration-300">
              <div className="relative">
                  {renderDataSection('Staking', selectedBaker.staking,
                    bakerStats && (
                       <>
                        <div className="flex flex-col sm:col-span-2 mt-1 pt-2 border-t border-zinc-800/50">
                          <span className="text-[9px] text-zinc-600 uppercase mb-0.5">External Stake</span>
                          <span className="text-xs font-mono text-zinc-400 tabular-nums">{formatValue(bakerStats.externalStakedBalance / 1000000)} ꜩ</span>
                        </div>
                         <div className="flex flex-col mt-1 pt-2 border-t border-zinc-800/50">
                          <span className="text-[9px] text-zinc-600 uppercase mb-0.5">Stakers</span>
                          <span className="text-xs font-mono text-zinc-400 tabular-nums">{bakerStats.stakersCount}</span>
                        </div>
                        {bakerStats.unstakedBalance > 0 && (
                          <div className="flex flex-col sm:col-span-2 mt-1 pt-2 border-t border-zinc-800/50">
                            <span className="text-[9px] text-zinc-600 uppercase mb-0.5">Own Unstaked</span>
                            <span className="text-xs font-mono text-zinc-400 tabular-nums">{formatValue(bakerStats.unstakedBalance / 1000000)} ꜩ</span>
                          </div>
                        )}
                        {bakerStats.externalUnstakedBalance > 0 && (
                          <div className="flex flex-col sm:col-span-2 mt-1 pt-2 border-t border-zinc-800/50">
                            <span className="text-[9px] text-zinc-600 uppercase mb-0.5">External Unstaked</span>
                            <span className="text-xs font-mono text-zinc-400 tabular-nums">{formatValue(bakerStats.externalUnstakedBalance / 1000000)} ꜩ</span>
                          </div>
                        )}
                       </>
                    )
                  )}
              </div>
              <div className="relative md:pl-8 md:border-l md:border-zinc-800/30">
                  {renderDataSection('Delegation', selectedBaker.delegation, 
                    bakerStats && (
                      <div className="flex flex-col sm:col-span-2 mt-1 pt-2 border-t border-zinc-800/50">
                        <span className="text-[9px] text-zinc-600 uppercase mb-0.5">Delegated Amount</span>
                        <span className="text-xs font-mono text-zinc-400 tabular-nums">{formatValue(bakerStats.delegatedBalance / 1000000)} ꜩ</span>
                      </div>
                    )
                  )}
              </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading && !allRights.length) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-4 h-4 border border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Loading chain data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 border border-red-900/20 bg-red-950/5 rounded text-center">
          <p className="text-[11px] text-red-400 font-mono mb-3">{error}</p>
          <button 
            onClick={fetchData}
            className="px-3 py-1 bg-zinc-900 text-zinc-400 text-[10px] font-bold uppercase rounded border border-zinc-800 hover:text-zinc-100 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (bakingRights.length === 0 && allRights.length > 0) {
      return (
        <div className="text-center py-12">
          <p className="text-zinc-600 text-[11px] font-mono uppercase">No upcoming baking rights in loaded range</p>
        </div>
      );
    }

    if (allRights.length === 0) {
        return (
          <div className="text-center py-12">
            <p className="text-zinc-600 text-[11px] font-mono uppercase">No upcoming rights detected</p>
          </div>
        );
    }

    return (
      <div className="space-y-6">
        {/* Stats Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-zinc-900/20 rounded-md border border-zinc-900/50 gap-4 sm:gap-0">
          <div className="flex gap-6 sm:gap-8 overflow-x-auto pb-2 sm:pb-0">
            <div className="flex flex-col min-w-max">
              <span className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.15em]">Baking Slots</span>
              <span className="text-xs font-mono text-zinc-400">{bakingRights.length}</span>
            </div>
            <div className="flex flex-col min-w-max">
              <span className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.15em]">Cycles</span>
              <span className="text-xs font-mono text-zinc-400">{Object.keys(groupedByCycle).length}</span>
            </div>
            <div className="flex flex-col min-w-max">
              <span className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.15em]">Next Block</span>
              <span className={`text-xs font-mono tabular-nums ${timeToNextBlock > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                {timeToNextBlock > 0 ? formatDuration(timeToNextBlock) : '--'}
              </span>
            </div>
             <div className="flex flex-col min-w-max">
              <span className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.15em]">Horizon</span>
              <span className="text-xs font-mono text-zinc-400 tabular-nums">
                {formatDuration(dataCoverageInterval)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t sm:border-t-0 border-zinc-900/50 pt-2 sm:pt-0">
             {/* Toggle Round 1 */}
             <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowRound1(!showRound1)}>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${showRound1 ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm ${showRound1 ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-300 group-hover:text-zinc-200 transition-colors">Maybe I'm lucky</span>
                    <span className="text-[8px] text-zinc-500">Show priorities up to 1</span>
                </div>
             </div>
             
             <div className="text-right pl-4 border-l border-zinc-800/50">
                <span className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.15em] block">Chain Height</span>
                <span className="text-sm font-mono text-blue-500 font-bold tabular-nums">
                {currentLevel?.toLocaleString()}
                </span>
             </div>
          </div>
        </div>


        {/* Cycle Blocks */}
        <div className="space-y-8">
          {(Object.entries(groupedByCycle) as [string, BakingRight[]][]).map(([cycle, cycleRights]) => (
            <section key={cycle} className="space-y-2">
              <div className="flex items-center gap-3 px-1 border-b border-zinc-900 pb-1.5">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">
                  Cycle {cycle}
                </span>
                <span className="text-[9px] text-zinc-700 font-mono uppercase">
                  {cycleRights.length} slots
                </span>
                <div className="flex-grow h-px bg-zinc-900" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
                {cycleRights.map((right, idx) => (
                  <BakingRightCell key={`${right.level}-${idx}`} right={right} />
                ))}
              </div>
              
              {cycles[parseInt(cycle)] && (
                <div className="flex items-center justify-end gap-4 pt-3 pb-1 opacity-60">
                   <div className="flex items-center gap-1.5">
                     <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">End Level</span>
                     <span className="text-[10px] text-zinc-500 font-mono">{cycles[parseInt(cycle)].lastLevel.toLocaleString()}</span>
                   </div>
                   <div className="w-px h-3 bg-zinc-800"></div>
                   <div className="flex items-center gap-1.5">
                     <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">Est. End</span>
                     <span className="text-[10px] text-zinc-500 font-mono">{new Date(cycles[parseInt(cycle)].endTime).toLocaleString()}</span>
                   </div>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Layout 
      isRefreshing={isLoading && allRights.length > 0}
      bakerSelector={
        <BakerSelector 
          bakers={bakers} 
          selectedBaker={selectedBaker} 
          onSelect={handleBakerSelect} 
        />
      }
    >
      {renderBakerInfo()}
      {renderContent()}
      
        {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsBlockModalOpen(false)}>
           <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-sm w-full p-0 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                 <h3 className="text-zinc-200 font-bold text-sm uppercase tracking-wider">Recent History</h3>
                 <button onClick={() => setIsBlockModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>
              </div>
              
              <div className="flex flex-col max-h-[320px] overflow-y-auto custom-scrollbar">
                 {isLoadingHistory && pastRights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                       <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
                       <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Loading history...</span>
                    </div>
                 ) : pastRights.length === 0 ? (
                    <div className="p-8 text-center text-zinc-600 text-[10px] uppercase font-mono">No recent rights found</div>
                 ) : (
                    pastRights.map((right, i) => {
                       const isSuccess = right.status === 'realized';
                       const isMissed = right.status === 'missed_baking' || right.status === 'missed_endorsing'; // usually type=baking so missed_baking
                       const statusColor = isSuccess ? 'text-green-500' : isMissed ? 'text-red-500' : 'text-zinc-500';
                       const bgHover = 'hover:bg-zinc-800/50';

                       return (
                          <a 
                            key={right.level}
                            href={`https://tzkt.io/${right.level}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-between p-3 border-b border-zinc-800/50 last:border-0 transition-colors ${bgHover} group`}
                          >
                             <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]' : isMissed ? 'bg-red-500' : 'bg-zinc-600'}`} />
                                 <div className="flex flex-col">
                                   <div className="flex items-center gap-2">
                                      <span className="text-[10px] uppercase font-bold text-zinc-500 mb-0.5">Cycle {right.cycle}</span>
                                      {right.round > 0 && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1 rounded-sm">R{right.round}</span>}
                                   </div>
                                   <span className="text-sm font-mono font-bold text-zinc-200 group-hover:text-blue-400 transition-colors">{right.level.toLocaleString()}</span>
                                </div>
                             </div>
                             
                             <div className="flex flex-col items-end">
                                <span className={`text-xs font-bold uppercase ${statusColor} mb-0.5`}>
                                   {right.status === 'realized' ? 'Baked' : right.status.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                   {formatDuration(Date.now() - new Date(right.timestamp).getTime())} ago
                                </span>
                             </div>
                          </a>
                       );
                    })
                 )}
              </div>
              {pastRights.length > 0 && (
                <div className="p-2 bg-zinc-950/30 text-center border-t border-zinc-800">
                   <span className="text-[8px] text-zinc-700 uppercase tracking-widest">Last 20 Slots</span>
                </div>
              )}
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
