import React, { useState, useEffect } from 'react';
import { Activity, Wifi } from 'lucide-react';

const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm py-4 px-6 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10">
      <div className="flex items-center gap-3 mb-2 md:mb-0">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">MediPulse</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Heart Check-Up Dashboard</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Wifi size={12} /> ESP32 Connected
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
