import React from 'react';
import { CheckUpResult, RiskLevel, RhythmStability } from '../types';
import { AlertCircle, CheckCircle, BrainCircuit, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

interface ResultsPanelProps {
  result: CheckUpResult;
  loadingAI: boolean;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, loadingAI }) => {
  
  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.NORMAL: return 'bg-green-100 text-green-800 border-green-200';
      case RiskLevel.MODERATE: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case RiskLevel.HIGH: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.NORMAL: return <CheckCircle size={20} />;
      case RiskLevel.MODERATE: return <AlertCircle size={20} />;
      case RiskLevel.HIGH: return <AlertTriangle size={20} />;
    }
  };

  const getRecommendationBadge = () => {
     if (result.riskLevel === RiskLevel.NORMAL) {
       return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">No recheck needed</span>;
     }
     if (result.riskLevel === RiskLevel.MODERATE) {
       return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Recheck after rest</span>;
     }
     return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Immediate attention</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {/* BPM Card */}
        <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide font-medium">Average BPM</span>
          <span className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{result.avgBpm}</span>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1 md:h-1.5 overflow-hidden">
             <div className="bg-slate-400 h-full" style={{ width: `${Math.min(result.confidenceScore, 100)}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
             Conf: {result.confidenceScore}%
          </span>
        </div>

        {/* Rhythm Card */}
        <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide font-medium">Rhythm Stability</span>
          <span className={`text-base md:text-lg font-bold mt-2 ${result.stability === RhythmStability.STABLE ? 'text-green-600' : 'text-yellow-600'}`}>
            {result.stability}
          </span>
          <span className="text-[10px] text-slate-400 mt-1">Var: {result.maxBpm - result.minBpm}</span>
        </div>

        {/* Risk Card */}
        <div className={`col-span-2 md:col-span-1 p-3 md:p-4 rounded-xl border shadow-sm flex flex-col items-center text-center ${getRiskColor(result.riskLevel)}`}>
          <span className="text-[10px] md:text-xs uppercase tracking-wide font-medium opacity-80">Screening Risk</span>
          <div className="flex items-center gap-2 mt-2">
            {getRiskIcon(result.riskLevel)}
            <span className="text-lg font-bold">{result.riskLevel}</span>
          </div>
          <div className="mt-2">
            {getRecommendationBadge()}
          </div>
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-6 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit className="text-indigo-600" size={24} />
          <h3 className="text-lg font-bold text-indigo-900">Automated Check-Up Insight</h3>
        </div>

        {loadingAI ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
             <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-sm text-indigo-700 font-medium">Analyzing patterns...</p>
          </div>
        ) : result.aiInsights ? (
          <div className="space-y-4">
            <p className="text-indigo-900 font-medium italic">"{result.aiInsights.summary}"</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white/60 p-4 rounded-lg">
                <h4 className="text-xs font-bold text-indigo-800 uppercase mb-2">Possible Factors</h4>
                <ul className="list-disc list-inside text-sm text-indigo-900 space-y-1">
                  {result.aiInsights.contributingFactors.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
              <div className="bg-white/60 p-4 rounded-lg">
                <h4 className="text-xs font-bold text-indigo-800 uppercase mb-2">Recommendations</h4>
                <ul className="list-disc list-inside text-sm text-indigo-900 space-y-1">
                  {result.aiInsights.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-red-500">Analysis unavailable.</p>
        )}
        
        <div className="mt-4 pt-4 border-t border-indigo-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
           <div className="text-[10px] text-indigo-800/60 uppercase tracking-wide">
            Disclaimer: This system does not provide medical diagnosis.
          </div>
          {result.symptoms.length > 0 && (
            <div className="text-[10px] bg-white/50 px-2 py-1 rounded text-indigo-800">
              Symptoms noted: {result.symptoms.join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Color Legend */}
      <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-4 text-[10px] text-slate-500 justify-center sm:justify-end no-print">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Normal: 60-100 BPM</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Elevated: 101-120 BPM</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Critical: &lt;50 or &gt;120</div>
      </div>

    </div>
  );
};

export default ResultsPanel;
