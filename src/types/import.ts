export interface ImportRecord {
  id: string;
  fileName: string;
  importType: 'turmas' | 'alunos' | 'professores';
  status: 'processing' | 'completed' | 'failed';
  rowsProcessed: number;
  rowsSucceeded: number;
  rowsFailed: number;
  errorLog: Array<{ row: number; field: string; message: string; value: any }>;
  importedBy: string;
  createdAt: string;
}

export interface ImportHistoryFilters {
  search: string;
  importType?: 'turmas' | 'alunos' | 'professores';
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