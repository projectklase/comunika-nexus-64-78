import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useCSVImport } from '@/hooks/useCSVImport';
import { useImportHistoryStore } from '@/stores/import-history-store';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { useProgramStore } from '@/stores/program-store';
import { useLevels } from '@/hooks/useLevels';
import { useToast } from '@/hooks/use-toast';
import { ColumnMapping } from '@/types/import';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_MAPPINGS = {
  turmas: [
    { systemField: 'name', label: 'Nome da Turma', required: true },
    { systemField: 'code', label: 'Código', required: false },
    { systemField: 'programId', label: 'Programa', required: true },
    { systemField: 'levelId', label: 'Nível', required: false },
    { systemField: 'grade', label: 'Série', required: false },
    { systemField: 'year', label: 'Ano', required: false },
    { systemField: 'status', label: 'Status', required: false },
  ],
  alunos: [
    { systemField: 'name', label: 'Nome', required: true },
    { systemField: 'email', label: 'Email', required: false },
    { systemField: 'phone', label: 'Telefone', required: false },
    { systemField: 'classId', label: 'Turma', required: false },
  ],
  professores: [
    { systemField: 'name', label: 'Nome', required: true },
    { systemField: 'email', label: 'Email', required: false },
    { systemField: 'phone', label: 'Telefone', required: false },
    { systemField: 'subject', label: 'Matéria Principal', required: false },
  ],
};

export function CSVImportModal({ isOpen, onClose }: CSVImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [importType, setImportType] = useState<'turmas' | 'alunos' | 'professores'>('turmas');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { parseCSV, processImport, previewData, setPreviewData, isLoading } = useCSVImport();
  const { addRecord } = useImportHistoryStore();
  const { createClass } = useClassStore();
  const { createPerson } = usePeopleStore();
  const { programs } = useProgramStore();
  const { levels } = useLevels();
  const { toast } = useToast();

  const resetModal = () => {
    setStep('upload');
    setSelectedFile(null);
    setMappings([]);
    setPreviewData(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Formato inválido',
        description: 'Apenas arquivos CSV são permitidos.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    try {
      const preview = await parseCSV(selectedFile);
      setPreviewData(preview);
      
      // Criar mapeamentos padrão
      const fieldMappings = FIELD_MAPPINGS[importType];
      const autoMappings: ColumnMapping[] = fieldMappings.map(field => ({
        csvColumn: preview.headers.find(h => 
          h.toLowerCase().includes(field.systemField.toLowerCase()) ||
          h.toLowerCase().includes(field.label.toLowerCase())
        ) || '',
        systemField: field.systemField,
        required: field.required,
      }));
      
      setMappings(autoMappings);
      setStep('mapping');
    } catch (error) {
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Não foi possível ler o arquivo CSV.',
        variant: 'destructive',
      });
    }
  };

  const handleMappingComplete = () => {
    if (!previewData) return;
    
    // Validar dados
    const errors = [];
    
    // Verificar se campos obrigatórios estão mapeados
    const requiredFields = mappings.filter(m => m.required);
    const unmappedRequired = requiredFields.filter(m => !m.csvColumn);
    
    if (unmappedRequired.length > 0) {
      toast({
        title: 'Mapeamento incompleto',
        description: 'Todos os campos obrigatórios devem ser mapeados.',
        variant: 'destructive',
      });
      return;
    }

    setStep('preview');
  };

  const handleImport = async () => {
    if (!selectedFile || !previewData) return;

    setStep('importing');
    setImportProgress(0);

    try {
      const result = await processImport(selectedFile, mappings, importType);
      
      let successCount = 0;
      const errors: string[] = [];

      // Processar dados baseado no tipo
      for (let i = 0; i < result.data.length; i++) {
        const row = result.data[i];
        setImportProgress((i / result.data.length) * 100);

        try {
          if (importType === 'turmas') {
            const programName = row[mappings.find(m => m.systemField === 'programId')?.csvColumn || ''];
            const program = programs.find(p => p.name === programName);
            
            if (!program) {
              errors.push(`Linha ${i + 1}: Programa "${programName}" não encontrado`);
              continue;
            }

            await createClass({
              name: row[mappings.find(m => m.systemField === 'name')?.csvColumn || ''],
              code: row[mappings.find(m => m.systemField === 'code')?.csvColumn || ''] || undefined,
              programId: program.id,
              levelId: undefined,
              grade: row[mappings.find(m => m.systemField === 'grade')?.csvColumn || ''] || undefined,
              year: parseInt(row[mappings.find(m => m.systemField === 'year')?.csvColumn || '']) || new Date().getFullYear(),
              status: row[mappings.find(m => m.systemField === 'status')?.csvColumn || ''] === 'ARQUIVADA' ? 'ARQUIVADA' : 'ATIVA',
              daysOfWeek: [],
              startTime: '08:00',
              endTime: '17:00',
              teachers: [],
              students: [],
            });
          } else {
            await createPerson({
              name: row[mappings.find(m => m.systemField === 'name')?.csvColumn || ''],
              email: row[mappings.find(m => m.systemField === 'email')?.csvColumn || ''] || undefined,
              role: importType === 'alunos' ? 'ALUNO' : 'PROFESSOR',
              isActive: true
            });
          }
          
          successCount++;
        } catch (error) {
          errors.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Salvar no histórico
      await addRecord({
        importType: importType,
        fileName: selectedFile.name,
        status: errors.length === 0 ? 'completed' : (successCount > 0 ? 'completed' : 'failed'),
        rowsProcessed: result.totalRows,
        rowsSucceeded: successCount,
        rowsFailed: errors.length,
        errorLog: errors.map((err, idx) => ({
          row: idx + 1,
          field: 'unknown',
          message: err,
          value: null
        })),
        importedBy: '', // Will be set by the backend
      });

      toast({
        title: 'Importação concluída',
        description: `${successCount} registros importados com sucesso.`,
      });

      handleClose();
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro durante a importação.',
        variant: 'destructive',
      });
    }
  };

  const downloadTemplate = () => {
    const headers = FIELD_MAPPINGS[importType].map(field => field.label);
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${importType}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar dados via CSV</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={step} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload" disabled={step !== 'upload'}>
                1. Upload
              </TabsTrigger>
              <TabsTrigger value="mapping" disabled={step !== 'mapping'}>
                2. Mapeamento
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={step !== 'preview'}>
                3. Prévia
              </TabsTrigger>
              <TabsTrigger value="importing" disabled={step !== 'importing'}>
                4. Importando
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-4">
              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Tipo de importação</Label>
                    <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="turmas">Turmas</SelectItem>
                        <SelectItem value="alunos">Alunos</SelectItem>
                        <SelectItem value="professores">Professores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Arquivo CSV (máx. 5MB)</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTemplate}
                      className="ml-4"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Template
                    </Button>
                  </div>

                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedFile ? selectedFile.name : 'Clique para selecionar ou arraste um arquivo CSV'}
                    </p>
                  </div>

                  {selectedFile && (
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setSelectedFile(null)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleProcessFile} disabled={isLoading}>
                        {isLoading ? 'Processando...' : 'Continuar'}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-4">
                {previewData && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Mapeie as colunas do seu CSV para os campos do sistema. Campos marcados com * são obrigatórios.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      {FIELD_MAPPINGS[importType].map((field, index) => (
                        <div key={field.systemField} className="grid grid-cols-2 gap-4 items-center">
                          <Label className="text-sm">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </Label>
                          <Select
                            value={mappings[index]?.csvColumn || 'none'}
                            onValueChange={(value) => {
                              const newMappings = [...mappings];
                              newMappings[index] = {
                                ...newMappings[index],
                                csvColumn: value === 'none' ? '' : value,
                              };
                              setMappings(newMappings);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma coluna" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Não mapear</SelectItem>
                              {previewData.headers.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setStep('upload')}>
                        Voltar
                      </Button>
                      <Button onClick={handleMappingComplete}>
                        Continuar
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                {previewData && (
                  <div className="space-y-4">
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        Prévia dos dados que serão importados (primeiras 5 linhas)
                      </AlertDescription>
                    </Alert>

                    <div className="border rounded-lg overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            {mappings.filter(m => m.csvColumn).map((mapping) => (
                              <th key={mapping.systemField} className="p-2 text-left">
                                {FIELD_MAPPINGS[importType].find(f => f.systemField === mapping.systemField)?.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.rows.slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-b">
                              {mappings.filter(m => m.csvColumn).map((mapping) => (
                                <td key={mapping.systemField} className="p-2">
                                  {row[mapping.csvColumn] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setStep('mapping')}>
                        Voltar
                      </Button>
                      <Button onClick={handleImport}>
                        Importar Dados
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="importing" className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Importando dados...</h3>
                    <p className="text-gray-600">Aguarde enquanto processamos seu arquivo.</p>
                  </div>
                  <div className="w-full max-w-md mx-auto">
                    <Progress value={importProgress} className="w-full" />
                    <p className="text-sm text-gray-500 mt-2">{Math.round(importProgress)}% concluído</p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}