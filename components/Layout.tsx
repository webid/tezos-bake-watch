
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  isRefreshing?: boolean;
  bakerSelector?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, isRefreshing, bakerSelector }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800">
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        {/* Subtle loading indicator */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 w-full h-[1px] bg-zinc-800 overflow-hidden">
            <div className="h-full w-1/3 bg-blue-500 animate-shimmer" />
          </div>
        )}
        
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full bg-blue-500 ${isRefreshing ? 'animate-pulse' : ''} shadow-[0_0_8px_rgba(59,130,246,0.5)]`} />
            <h1 className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">Tezos Bake Watch</h1>
          </div>
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <span className="text-[8px] font-mono text-blue-500/60 uppercase tracking-widest animate-pulse">
                Syncing
              </span>
            )}
            {bakerSelector}
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="max-w-3xl mx-auto px-4 py-8 border-t border-zinc-900/50 text-zinc-700 text-[9px] font-mono uppercase tracking-[0.3em] text-center">
        Data Sync: TZKT API & Baking Bad
      </footer>
    </div>
  );
};

export default Layout;
