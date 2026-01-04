import React from 'react';
import { User } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onGuest: () => void;
  isLoading: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGuest, isLoading }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Header Section */}
      <div className="text-center mb-16 animate-fade-in">
         {/* Logo Container */}
         <div className="mb-8 relative inline-block group cursor-default hover:scale-105 transition-transform duration-300">
            {/* Custom Logo: Simple Blue Note with Small Red Pins */}
            <svg width="180" height="180" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              
              {/* Rotated Note Group (Restored from previous version) */}
              <g transform="translate(60, 75) rotate(-25)">
                  {/* Note Shadow */}
                  <rect x="-45" y="-25" width="90" height="50" rx="8" fill="black" fillOpacity="0.1" transform="translate(4,4)" />
                  
                  {/* Note Body */}
                  <rect x="-45" y="-25" width="90" height="50" rx="8" stroke="#0ea5e9" strokeWidth="5" fill="#f0f9ff" />
                  
                  {/* Center Circle */}
                  <circle cx="0" cy="0" r="14" stroke="#0ea5e9" strokeWidth="4" fill="none" />
                  
                  {/* Corner Dots */}
                  <circle cx="-32" cy="-14" r="3" fill="#0ea5e9" />
                  <circle cx="32" cy="-14" r="3" fill="#0ea5e9" />
                  <circle cx="-32" cy="14" r="3" fill="#0ea5e9" />
                  <circle cx="32" cy="14" r="3" fill="#0ea5e9" />
              </g>

              {/* Small Red Pins (Positioned to fit this note) */}
              
              {/* Pin 1: Left */}
              <g transform="translate(45, 70) scale(0.5)">
                  <circle cx="0" cy="0" r="3" fill="#000" opacity="0.2" />
                  <path d="M0 0 C-6 -8 -8 -13 -8 -18 C-8 -24 0 -28 0 -28 C0 -28 8 -24 8 -18 C8 -13 6 -8 0 0Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" transform="translate(0, -1)"/>
                  <circle cx="0" cy="-19" r="4" fill="#7f1d1d" />
              </g>

              {/* Pin 2: Top Right */}
              <g transform="translate(80, 50) scale(0.5)">
                  <circle cx="0" cy="0" r="3" fill="#000" opacity="0.2" />
                  <path d="M0 0 C-6 -8 -8 -13 -8 -18 C-8 -24 0 -28 0 -28 C0 -28 8 -24 8 -18 C8 -13 6 -8 0 0Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" transform="translate(0, -1)"/>
                  <circle cx="0" cy="-19" r="4" fill="#7f1d1d" />
              </g>
              
              {/* Pin 3: Bottom Center/Right */}
              <g transform="translate(75, 80) scale(0.5)">
                  <circle cx="0" cy="0" r="3" fill="#000" opacity="0.2" />
                  <path d="M0 0 C-6 -8 -8 -13 -8 -18 C-8 -24 0 -28 0 -28 C0 -28 8 -24 8 -18 C8 -13 6 -8 0 0Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" transform="translate(0, -1)"/>
                  <circle cx="0" cy="-19" r="4" fill="#7f1d1d" />
              </g>
            </svg>
         </div>
         
         <h1 className="text-5xl font-extrabold text-slate-900 mb-3 tracking-tight font-sans">CashMap</h1>
         <p className="text-cyan-500 text-[11px] font-extrabold uppercase tracking-[0.3em] font-sans">Where money finds direction</p>
      </div>

      {/* Cards Container */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center items-stretch mb-16 animate-scale-in">
        
        {/* Guest Card */}
        <button 
          onClick={onGuest}
          disabled={isLoading}
          className="flex-1 bg-white rounded-[2.5rem] p-10 shadow-[0_4px_40px_-12px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:border-slate-200 hover:-translate-y-1 transition-all duration-300 group text-center flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-[#F1F5F9] rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:bg-slate-200 transition-colors">
            <User className="w-10 h-10 text-slate-400 group-hover:text-slate-600 transition-colors stroke-[1.5]" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Guest Mode</h2>
          <p className="text-slate-500 leading-relaxed max-w-[240px] mx-auto text-sm font-medium">
            Start using immediately. Data is stored locally on this device.
          </p>
        </button>

        {/* Google Card */}
        <button 
          onClick={onLogin}
          disabled={isLoading}
          className="flex-1 bg-white rounded-[2.5rem] p-10 shadow-[0_4px_40px_-12px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:border-slate-200 hover:-translate-y-1 transition-all duration-300 group text-center flex flex-col items-center relative overflow-hidden"
        >
           {isLoading && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20 backdrop-blur-[1px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                    <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Connecting</span>
                  </div>
              </div>
           )}

          <div className="w-20 h-20 bg-[#F1F5F9] rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:bg-white group-hover:shadow-md transition-all">
             {/* Google G Logo SVG */}
            <svg className="w-10 h-10" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Sign in with Google</h2>
          <p className="text-slate-500 leading-relaxed max-w-[240px] mx-auto text-sm font-medium">
            Sync your budget securely across all your devices using Drive.
          </p>
        </button>
      </div>

      {/* Footer Text */}
      <div className="text-center animate-fade-in delay-200">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Select an option to continue
          </p>
      </div>

    </div>
  );
};