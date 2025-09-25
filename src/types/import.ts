export interface ImportRecord {
  id: string;
  type: 'turmas' | 'alunos' | 'professores';
  fileName: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  importedAt: string;
}

export interface ImportHistoryFilters {
  search: string;
  type?: 'turmas' | 'alunos' | 'professores';
}

export interface ColumnMapping {
  csvColumn: string;
  systemField: string;
  required: boolean;
}

export interface ImportPreviewData {
  headers: string[];
  rows: any[];
  mappings: ColumnMapping[];
  validationErrors: ValidationError[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}