export interface ExportData {
  heatmapData: any;
  retentionData: any;
  operationalData: {
    // Campos antigos (manter para compatibilidade)
    occupancy_data: any;
    avg_occupancy: number;
    koins_distribution: any;
    teacher_roi: any;
    
    // NOVOS campos de Koins
    koin_ecosystem_score: number;
    total_students: number;
    active_students: number;
    participation_rate: number;
    total_koins_in_circulation: number;
    total_koins_distributed: number;
    total_koins_spent: number;
    circulation_velocity: number;
    total_redemptions: number;
    conversion_rate: number;
    avg_redemption_value: number;
    approval_rate: number;
    avg_processing_time_hours: number;
    top_students: Array<{
      position: number;
      name: string;
      total_koins: number;
      koins_spent: number;
    }>;
    top_items: Array<{
      name: string;
      redemption_count: number;
      total_koins_moved: number;
    }>;
    monthly_evolution: Array<{
      month: string;
      distributed: number;
      spent: number;
    }>;
    redemption_status: {
      pending: number;
      approved: number;
      rejected: number;
    };
  };
  pulseData: any;
  analytics: any;
  postReadData: any;
  daysFilter: number;
}

export interface CellStyle {
  bgColor: string;
  fontColor?: string;
  bold?: boolean;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
}
