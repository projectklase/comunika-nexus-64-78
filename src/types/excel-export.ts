export interface ExportData {
  heatmapData: any;
  retentionData: any;
  operationalData: any;
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
