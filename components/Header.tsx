import React, { useState, useEffect } from 'react';
import { Activity, Wifi } from 'lucide-react';

const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm py-3 px-4 md:py-4 md:px-6 flex justify-between items-center sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-1.5 md:p-2 rounded-lg text-white">
          <Activity size={20} className="md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">MediBand</h1>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-wider">Heart Check-Up</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-slate-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] md:text-xs font-semibold text-slate-600 flex items-center gap-1">
            <span className="hidden md:inline"><Wifi size={12} /></span> 
            <span className="hidden md:inline">ESP32 Connected</span>
            <span className="md:hidden">Online</span>
          </span>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-700">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-xs text-slate-500">
            {currentTime.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
