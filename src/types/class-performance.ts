export interface ClassPerformanceAnalytics {
  class_id: string;
  class_name: string;
  total_students: number;
  active_students_last_7_days: number;
  total_activities_assigned: number;
  total_deliveries: number;
  delivery_rate: number; // Percentual de entregas vs atividades atribuídas
  avg_days_to_deliver: number | null; // Média de dias para entrega
  pending_deliveries: number;
  approved_deliveries: number;
  returned_deliveries: number;
  late_deliveries: number;
}
