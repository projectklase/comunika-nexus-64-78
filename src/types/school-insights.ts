export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type TrendLevel = "declining" | "stable" | "growing";
export type PriorityLevel = "low" | "medium" | "high";

export interface EvasionInsights {
  severity: SeverityLevel;
  prediction: string;
  recommendations: string[];
}

export interface EngagementInsights {
  trend: TrendLevel;
  analysis: string;
  opportunities: string[];
}

export interface PriorityAction {
  action: string;
  priority: PriorityLevel;
  impact: string;
}

export interface Predictions {
  nextWeekTrend: string;
  riskForecast: string;
}

export interface SchoolInsights {
  evasionInsights: EvasionInsights;
  engagementInsights: EngagementInsights;
  priorityActions: PriorityAction[];
  predictions: Predictions;
}

export interface InsightsResponse {
  insights: SchoolInsights;
  generatedAt: string;
}
