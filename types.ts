export enum RiskLevel {
  NORMAL = 'Normal',
  MODERATE = 'Moderate',
  HIGH = 'High'
}

export enum RhythmStability {
  STABLE = 'Stable',
  SLIGHTLY_IRREGULAR = 'Slightly Irregular',
  IRREGULAR = 'Irregular'
}

export interface CheckUpResult {
  id: string;
  patientId: string;
  timestamp: string;
  avgBpm: number;
  maxBpm: number;
  minBpm: number;
  stability: RhythmStability;
  riskLevel: RiskLevel;
  symptoms: string[];
  confidenceScore: number;
  aiInsights?: AIInsightData;
}

export interface AIInsightData {
  contributingFactors: string[];
  recommendations: string[];
  summary: string;
}

export type AppStatus = 'IDLE' | 'MEASURING' | 'COMPLETED' | 'CONNECTING';

export const CHECKUP_DURATION_SEC = 15; // Shortened for demo purposes (usually 30-60s)
