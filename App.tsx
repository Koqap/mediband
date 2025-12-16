import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import LiveMonitor from './components/LiveMonitor';
import ResultsPanel from './components/ResultsPanel';
import { generateScreeningInsight } from './services/geminiService';
import { 
  AppStatus, 
  CHECKUP_DURATION_SEC, 
  CheckUpResult, 
  RiskLevel, 
  RhythmStability 
} from './types';
import { Play, RotateCcw, Save, Printer, User, History as HistoryIcon, Activity } from 'lucide-react';

export default function App() {
  // State
  const [patientId, setPatientId] = useState('');
  const [status, setStatus] = useState<AppStatus>('IDLE');
  const [currentBpm, setCurrentBpm] = useState(0);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<CheckUpResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [history, setHistory] = useState<CheckUpResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // New State Features
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [signalQuality, setSignalQuality] = useState<'Good' | 'Fair' | 'Poor'>('Good');

  // Refs for simulation
  const timerRef = useRef<number | null>(null);
  const dataPointsRef = useRef<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms(prev => [...prev, symptom]);
    }
  };

  // Auto-start Polling
  useEffect(() => {
    let pollInterval: number;

    if (status === 'IDLE' || status === 'COMPLETED') {
      pollInterval = window.setInterval(async () => {
        try {
          const res = await fetch('/api/latest');
          const data = await res.json();
          
          // If device is measuring, auto-start
          if (data && data.status === 'MEASURING') {
             // Only start if we aren't already (double check handled by status check above)
             // Use a default ID if none entered to ensure smooth demo
             if (!patientId) setPatientId("Guest Patient");
             startCheckUp(true);
          }
        } catch (e) {
          console.error("Error polling for auto-start", e);
        }
      }, 1000);
    }

    return () => clearInterval(pollInterval);
  }, [status, patientId]);

  const startCheckUp = (autoStart = false) => {
    if (!autoStart && !patientId.trim()) {
      alert("Please enter a Patient ID first.");
      return;
    }
    
    setStatus('MEASURING');
    setProgress(0);
    setLastResult(null);
    setShowHistory(false);
    dataPointsRef.current = [];
    setSignalQuality('Good');
    
    // Real Data Polling Loop
    let elapsed = 0;
    
    timerRef.current = window.setInterval(async () => {
      elapsed += 1;
      setProgress(elapsed);

      try {
        const res = await fetch('/api/latest');
        const data = await res.json();
        
        if (data && typeof data.bpm === 'number') {
           setCurrentBpm(data.bpm);
           dataPointsRef.current.push(data.bpm);
        }
      } catch (e) {
        console.error("Error fetching data", e);
      }

      if (elapsed >= CHECKUP_DURATION_SEC) {
        completeCheckUp();
      }
    }, 1000);
  };

  const stopSimulation = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const completeCheckUp = async () => {
    stopSimulation();
    setStatus('COMPLETED');
    setSignalQuality('Good'); // Reset signal on complete

    // Calculate Stats
    const data = dataPointsRef.current;
    if (data.length === 0) return;

    const sum = data.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / data.length);
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    // Determine Stability (Simulated Logic)
    const variance = max - min;
    let stability = RhythmStability.STABLE;
    if (variance > 15) stability = RhythmStability.SLIGHTLY_IRREGULAR;
    if (variance > 25) stability = RhythmStability.IRREGULAR;

    // Determine Risk
    let risk = RiskLevel.NORMAL;
    if (avg > 100 || avg < 50) risk = RiskLevel.MODERATE;
    if (avg > 120 || avg < 40 || stability === RhythmStability.IRREGULAR) risk = RiskLevel.HIGH;

    // Mock Confidence Score Calculation
    // Higher stability & more data points = higher confidence
    let confidence = 98; 
    if (stability !== RhythmStability.STABLE) confidence -= 15;
    if (data.length < CHECKUP_DURATION_SEC) confidence -= 20; 
    confidence = Math.max(confidence, 60); // Min 60%

    const result: CheckUpResult = {
      id: Date.now().toString(),
      patientId: patientId,
      timestamp: new Date().toISOString(),
      avgBpm: avg,
      minBpm: min,
      maxBpm: max,
      stability,
      riskLevel: risk,
      symptoms: selectedSymptoms,
      confidenceScore: confidence
    };

    setLastResult(result);
    setLoadingAI(true);

    // Call Gemini API with symptoms
    const aiData = await generateScreeningInsight(avg, stability, risk, selectedSymptoms);
    
    const finalResult = { ...result, aiInsights: aiData };
    setLastResult(finalResult);
    setLoadingAI(false);
  };

  const saveResult = () => {
    if (lastResult) {
      setHistory(prev => [lastResult, ...prev]);
      alert("Check-up result saved to history.");
      setStatus('IDLE');
      setPatientId('');
      setSelectedSymptoms([]);
      setCurrentBpm(0);
      setLastResult(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const SYMPTOM_OPTIONS = ["Dizziness", "Fatigue", "Shortness of Breath", "Chest Discomfort", "Anxiety"];

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <Header />

      <main className="flex-grow p-4 md:p-8 max-w-6xl mx-auto w-full space-y-8">
        
        {/* Patient Control Panel */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 no-print">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Input Column */}
            <div className="md:col-span-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Patient Identification</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Enter Patient Name or ID"
                    disabled={status === 'MEASURING'}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-semibold text-slate-600 mb-2">Reported Symptoms (Optional)</label>
                 <div className="flex flex-wrap gap-2">
                   {SYMPTOM_OPTIONS.map(s => (
                     <button
                       key={s}
                       onClick={() => toggleSymptom(s)}
                       disabled={status === 'MEASURING'}
                       className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                         selectedSymptoms.includes(s) 
                           ? 'bg-blue-100 border-blue-200 text-blue-700 font-medium' 
                           : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                       }`}
                     >
                       {s}
                     </button>
                   ))}
                 </div>
              </div>
            </div>

            {/* Actions Column */}
            <div className="md:col-span-7 flex flex-col md:flex-row gap-3 items-end justify-end pb-1">
              {status !== 'MEASURING' && (
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full md:w-auto px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <HistoryIcon size={20} />
                  History
                </button>
              )}
              
              {status === 'IDLE' || status === 'COMPLETED' ? (
                <button 
                  onClick={startCheckUp}
                  className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  <Play size={20} />
                  {status === 'COMPLETED' ? 'Start New Check' : 'Start Check-Up'}
                </button>
              ) : (
                <button 
                  disabled
                  className="w-full md:w-auto px-8 py-3 bg-slate-100 text-slate-400 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  Running...
                </button>
              )}
            </div>
          </div>
        </section>

        {/* History View */}
        {showHistory ? (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold">Patient History</h2>
                <button onClick={() => setShowHistory(false)} className="text-sm text-blue-600 font-medium">Close History</button>
             </div>
             {history.length === 0 ? (
               <div className="p-12 text-center text-slate-400">No records saved yet.</div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Patient</th>
                        <th className="px-6 py-4 font-semibold">Avg BPM</th>
                        <th className="px-6 py-4 font-semibold">Risk Level</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">{new Date(h.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4 font-medium">{h.patientId}</td>
                          <td className="px-6 py-4">{h.avgBpm}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              h.riskLevel === RiskLevel.NORMAL ? 'bg-green-100 text-green-700' :
                              h.riskLevel === RiskLevel.MODERATE ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>{h.riskLevel}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{h.stability}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             )}
          </section>
        ) : (
          /* Main Dashboard View */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Monitor */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                Live Monitor
              </h2>
              <LiveMonitor 
                bpm={currentBpm} 
                status={status} 
                progress={progress} 
                duration={CHECKUP_DURATION_SEC}
                signalQuality={signalQuality}
              />
              
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                <strong>Instructions:</strong> Ensure patient is seated comfortably. Do not talk during the {CHECKUP_DURATION_SEC}-second measurement window.
              </div>
            </div>

            {/* Right: Results (Only show when not idle/measuring or if we have a result) */}
            <div className="space-y-6">
               <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                Screening Results
              </h2>

              {lastResult ? (
                <>
                  <ResultsPanel result={lastResult} loadingAI={loadingAI} />
                  
                  {/* Actions */}
                  {!loadingAI && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 no-print">
                      <button 
                        onClick={startCheckUp}
                        className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 flex justify-center items-center gap-2"
                      >
                        <RotateCcw size={18} /> Recheck
                      </button>
                      <button 
                         onClick={saveResult}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 flex justify-center items-center gap-2 shadow-lg shadow-emerald-100"
                      >
                        <Save size={18} /> Save Record
                      </button>
                      <button 
                        onClick={handlePrint}
                        className="flex-1 px-4 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-900 flex justify-center items-center gap-2 shadow-lg shadow-slate-200"
                      >
                        <Printer size={18} /> Export PDF
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-80 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                  <ActivityPlaceholder />
                  <p className="mt-4 font-medium">Waiting for check-up data...</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

const ActivityPlaceholder = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
