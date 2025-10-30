export interface StudentAtRisk {
  student_id: string;
  student_name: string;
  class_name: string | null;
  days_since_last_login: number | null;
  pending_deliveries: number;
  pending_evaluations: number;
}

export interface ActivityTrendDay {
  date: string; // 'YYYY-MM-DD'
  activities_published: number;
  deliveries_made: number;
}

export interface EvasionRiskAnalytics {
  students_at_risk_count: number;
  worst_class_name: string | null;
  worst_class_pending_count: number;
  activity_trend: ActivityTrendDay[];
  students_at_risk_list: StudentAtRisk[];
}
