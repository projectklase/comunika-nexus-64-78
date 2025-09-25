import { useState, useCallback } from 'react';
import { ValidationError, ImportPreviewData, ColumnMapping } from '@/types/import';

export const useCSVImport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);

  const parseCSV = useCallback(async (file: File): Promise<ImportPreviewData> => {
    const { default: Papa } = await import('papaparse');
    
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const headers = results.meta.fields || [];
            const rows = results.data as any[];
            
            const previewData: ImportPreviewData = {
              headers,
              rows: rows.slice(0, 5), // Primeiras 5 linhas para prévia
              mappings: [],
              validationErrors: [],
            };
            
            resolve(previewData);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }, []);

  const validateData = useCallback((
    data: any[], 
    mappings: ColumnMapping[], 
    type: 'turmas' | 'alunos' | 'professores'
  ): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    data.forEach((row, index) => {
      mappings.forEach((mapping) => {
        if (mapping.required && (!row[mapping.csvColumn] || row[mapping.csvColumn].toString().trim() === '')) {
          errors.push({
            row: index + 1,
            field: mapping.systemField,
            message: `Campo obrigatório não preenchido`,
            value: row[mapping.csvColumn]
          });
        }

        // Validações específicas por tipo
        if (type === 'turmas' && mapping.systemField === 'year') {
          const year = parseInt(row[mapping.csvColumn]);
          if (isNaN(year) || year < 2020 || year > 2030) {
            errors.push({
              row: index + 1,
              field: mapping.systemField,
              message: 'Ano deve estar entre 2020 e 2030',
              value: row[mapping.csvColumn]
            });
          }
        }

        if ((type === 'alunos' || type === 'professores') && mapping.systemField === 'email') {
          const email = row[mapping.csvColumn];
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push({
              row: index + 1,
              field: mapping.systemField,
              message: 'Email inválido',
              value: email
            });
          }
        }
      });
    });

    return errors;
  }, []);

  const processImport = useCallback(async (
    file: File,
    mappings: ColumnMapping[],
    type: 'turmas' | 'alunos' | 'professores'
  ) => {
    setIsLoading(true);
    
    try {
      const { default: Papa } = await import('papaparse');
      
      const result = await new Promise<any[]>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve(results.data as any[]);
          },
          error: reject
        });
      });

      const validationErrors = validateData(result, mappings, type);
      
      // Filtrar linhas válidas (sem erros críticos)
      const validRows = result.filter((_, index) => {
        return !validationErrors.some(error => 
          error.row === index + 1 && 
          mappings.find(m => m.systemField === error.field)?.required
        );
      });

      return {
        data: validRows,
        errors: validationErrors,
        totalRows: result.length,
        validRows: validRows.length,
      };
    } finally {
      setIsLoading(false);
    }
  }, [validateData]);

  return {
    isLoading,
    previewData,
    setPreviewData,
    parseCSV,
    validateData,
    processImport,
  };
};