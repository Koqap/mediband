import React from 'react';
import { Heart, Signal } from 'lucide-react';
import { AppStatus } from '../types';

interface LiveMonitorProps {
  bpm: number;
  status: AppStatus;
  progress: number;
  duration: number;
  signalQuality: 'Good' | 'Fair' | 'Poor';
}

const LiveMonitor: React.FC<LiveMonitorProps> = ({ bpm, status, progress, duration, signalQuality }) => {
  
  // Determine color based on BPM
  let colorClass = 'text-slate-400'; // Idle
  let bgColorClass = 'bg-slate-100';
  let heartColor = 'text-slate-300';

  if (status === 'MEASURING' || status === 'COMPLETED') {
    if (bpm < 60 || bpm > 100) {
      colorClass = 'text-yellow-600';
      bgColorClass = 'bg-yellow-50';
      heartColor = 'text-yellow-500';
    } 
    if (bpm > 120 || bpm < 40) {
      colorClass = 'text-red-600';
      bgColorClass = 'bg-red-50';
      heartColor = 'text-red-500';
    } 
    if (bpm >= 60 && bpm <= 100) {
      colorClass = 'text-green-600';
      bgColorClass = 'bg-green-50';
      heartColor = 'text-green-500';
    }
  }

  // Animation speed logic
  const animationDuration = status === 'MEASURING' ? `${60 / bpm}s` : '0s';

  const getSignalColor = () => {
    if (signalQuality === 'Good') return 'text-emerald-500';
    if (signalQuality === 'Fair') return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${bgColorClass} border-2 border-slate-100 h-80`}>
      
      {/* Signal Quality Indicator */}
      {status === 'MEASURING' && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
          <Signal size={14} className={getSignalColor()} />
          <span className="text-xs font-semibold text-slate-600">Signal: {signalQuality}</span>
        </div>
      )}

      {/* Background Pulse Effect */}
      {status === 'MEASURING' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
           <Heart 
            size={300} 
            className={`${heartColor}`} 
            style={{ animation: `pulse ${animationDuration} infinite` }}
           />
        </div>
      )}

      {/* Main Display */}
      <div className="z-10 flex flex-col items-center">
        <div className="relative mb-4">
           <Heart 
            size={80} 
            fill={status === 'MEASURING' ? "currentColor" : "none"}
            className={`${heartColor} transition-all duration-300`} 
            style={{ 
              animation: status === 'MEASURING' ? `beat ${animationDuration} infinite` : 'none',
              transformOrigin: 'center'
            }}
           />
        </div>

        <div className={`text-7xl font-bold tabular-nums tracking-tighter ${colorClass}`}>
          {bpm > 0 ? bpm : '--'}
        </div>
        
        <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-2">
          Beats Per Minute
        </div>

        {/* Timer / Progress */}
        {status === 'MEASURING' && (
          <div className="mt-6 w-64">
            <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
              <span>Measuring...</span>
              <span>{progress}s / {duration}s</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(progress / duration) * 100}%` }}
              />
            </div>
            {signalQuality !== 'Good' ? (
               <p className="text-center text-xs text-yellow-600 mt-2 font-medium animate-pulse">
                 Adjust finger position
               </p>
            ) : (
              <p className="text-center text-xs text-slate-400 mt-2">
                Keep patient still
              </p>
            )}
          </div>
        )}

        {status === 'IDLE' && (
            <p className="mt-8 text-slate-400 font-medium">Ready to start</p>
        )}
      </div>

      <style>{`
        @keyframes beat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.15); }
          30% { transform: scale(1); }
          45% { transform: scale(1.15); }
          60% { transform: scale(1); }
        }
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { opacity: 0.3; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiveMonitor;
