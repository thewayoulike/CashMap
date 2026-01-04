import React from 'react';
import { LayoutDashboard, Wallet, CreditCard, PieChart, LogOut, Cloud, CloudOff, RefreshCw, Menu, HelpCircle } from 'lucide-react';
import { UserProfile, SyncStatus } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
  syncStatus: SyncStatus;
}

const Logo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 120" fill="none" className={`overflow-visible ${className}`}>
      {/* Rotated Note Group */}
      <g transform="translate(60, 75) rotate(-25)">
          <rect x="-45" y="-25" width="90" height="50" rx="8" fill="black" fillOpacity="0.1" transform="translate(4,4)" />
          <rect x="-45" y="-25" width="90" height="50" rx="8" stroke="#0ea5e9" strokeWidth="5" fill="#f0f9ff" />
          <circle cx="0" cy="0" r="14" stroke="#0ea5e9" strokeWidth="4" fill="none" />
          <circle cx="-32" cy="-14" r="3" fill="#0ea5e9" />
          <circle cx="32" cy="-14" r="3" fill="#0ea5e9" />
          <circle cx="-32" cy="14" r="3" fill="#0ea5e9" />
          <circle cx="32" cy="14" r="3" fill="#0ea5e9" />
      </g>

      {/* Pins */}
      <g transform="translate(45, 70) scale(0.5)">
          <path d="M0 0 C-6 -8 -8 -13 -8 -18 C-8 -24 0 -28 0 -28 C0 -28 8 -24 8 -18 C8 -13 6 -8 0 0Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" transform="translate(0, -1)"/>
          <circle cx="0" cy="-19" r="4" fill="#7f1d1d" />
      </g>
      <g transform="translate(80, 50) scale(0.5)">
          <path d="M0 0 C-6 -8 -8 -13 -8 -18 C-8 -24 0 -28 0 -28 C0 -28 8 -24 8 -18 C8 -13 6 -8 0 0Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" transform="translate(0, -1)"/>
          <circle cx="0" cy="-19" r="4" fill="#7f1d1d" />
      </g>
      <g transform="translate(75, 80) scale(0.5)">
          <path d="M0 0 C-6 -8 -8 -13 -8 -18 C-8 -24 0 -28 0 -28 C0 -28 8 -24 8 -18 C8 -13 6 -8 0 0Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" transform="translate(0, -1)"/>
          <circle cx="0" cy="-19" r="4" fill="#7f1d1d" />
      </g>
  </svg>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout, syncStatus }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'income', icon: Wallet, label: 'Income Setup' },
    { id: 'budget', icon: PieChart, label: 'Budget & Categories' },
    { id: 'transactions', icon: CreditCard, label: 'Transactions' },
    { id: 'help', icon: HelpCircle, label: 'How it Works' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Sidebar (Desktop) / Topbar (Mobile) */}
      <nav 
        className="bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 md:w-72 md:flex-shrink-0 md:h-screen sticky top-0 z-40 flex flex-col shadow-2xl transition-all"
        style={{ backgroundColor: '#0f172a' }} // Kept strictly as fallback, mainly for color consistency
      >
        {/* Brand Header */}
        <div className="p-4 md:p-8 border-b border-slate-800/50 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10 md:w-12 md:h-12" />
            <div>
              <h1 className="text-xl md:text-2xl font-serif font-bold text-white tracking-tight leading-none">
                CashMap
              </h1>
            </div>
          </div>
          
          {/* Sync Status Badge */}
          <div className="flex items-center gap-2 pl-1">
             {syncStatus === 'local' ? (
                 <span className="flex items-center text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
                    <CloudOff className="w-3 h-3 mr-1" /> Local
                 </span>
             ) : (
                 <span className={`flex items-center text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors ${
                     syncStatus === 'synced' ? 'text-emerald-400 bg-emerald-900/30' : 
                     syncStatus === 'saving' ? 'text-cyan-400 bg-cyan-900/30' : 
                     'text-red-400 bg-red-900/30'
                 }`}>
                    {syncStatus === 'saving' ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Cloud className="w-3 h-3 mr-1" />}
                    {syncStatus === 'synced' ? 'Saved' : syncStatus === 'saving' ? 'Syncing...' : 'Error'}
                 </span>
             )}
          </div>
        </div>
        
        {/* Navigation Items */}
        {/* Removed 'scrollbar-hide' to allow visible scrolling on mobile, added 'w-full' to ensure full width container */}
        <div className="w-full md:w-auto flex-1 p-2 md:p-4 space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-visible flex flex-row md:flex-col items-center md:items-stretch">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center px-3 md:px-6 py-2 md:py-3 rounded-lg transition-all duration-200 whitespace-nowrap group text-xs md:text-base ${
                activeTab === item.id
                  ? 'bg-slate-800 text-white shadow-lg border-b-2 md:border-b-0 md:border-l-4 border-cyan-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <item.icon className={`w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 transition-colors ${activeTab === item.id ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className={`font-medium ${activeTab === item.id ? 'font-bold' : ''}`}>{item.label}</span>
            </button>
          ))}
        </div>
        
        {/* User Footer (Desktop Only mostly, or bottom of list) */}
        <div className="hidden md:block p-6 border-t border-slate-800/50 mt-auto">
            {user ? (
                <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800/50 rounded-xl">
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-slate-600" />
                    <div className="overflow-hidden">
                        <p className="text-xs text-white font-bold truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </div>
                </div>
            ) : (
                 <div className="mb-4 text-xs text-slate-500 text-center bg-slate-800/50 py-2 rounded-lg">Guest User</div>
            )}
            
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
            >
                <LogOut className="w-4 h-4" /> {user ? 'Sign Out' : 'Exit Guest'}
            </button>
        </div>

        {/* Mobile Logout (Icon only) */}
        <div className="md:hidden p-2 flex items-center justify-center border-l border-slate-800">
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white">
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 h-[calc(100vh-80px)] md:h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-10 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
};