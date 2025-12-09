import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useStudentImport, ImportStudentRow, ImportResult } from '@/hooks/useStudentImport';
import { toast } from 'sonner';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  FileText,
  Users,
  Mail,
  Baby,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type WizardStep = 'upload' | 'preview' | 'result';

export function StudentImportWizard({ open, onOpenChange, onComplete }: StudentImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'text'>('file');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<{ email: string[]; cpf: string[]; matricula: string[] }>({ email: [], cpf: [], matricula: [] });
  const [sendEmailsEnabled, setSendEmailsEnabled] = useState(true);
  
  const {
    isLoading,
    progress,
    currentRow,
    parsedRows,
    importSummary,
    parseCSV,
    validateImport,
    processImport,
    downloadCredentials,
    downloadTemplate,
    reset
  } = useStudentImport();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleParse = async () => {
    if (!csvText.trim()) {
      toast.error('Selecione um arquivo ou cole o conteúdo CSV');
      return;
    }
    
    try {
      const rows = await parseCSV(csvText);
      
      if (rows.length === 0) {
        toast.error('Nenhum dado encontrado no arquivo');
        return;
      }
      
      const validation = await validateImport(rows);
      
      if (validation.limitError) {
        setValidationError(validation.limitError);
      } else {
        setValidationError(null);
      }
      
      setDuplicateWarnings(validation.duplicates);
      setStep('preview');
      
    } catch (err) {
      toast.error('Erro ao processar arquivo CSV');
    }
  };

  const handleImport = async () => {
    if (validationError) {
      toast.error('Corrija os erros antes de continuar');
      return;
    }
    
    try {
      const summary = await processImport(parsedRows, sendEmailsEnabled);
      setStep('result');
      
      if (summary.succeeded > 0) {
        toast.success(`${summary.succeeded} aluno(s) importado(s) com sucesso!`);
      }
      
      if (summary.emailsSent > 0) {
        toast.success(`${summary.emailsSent} email(s) de credenciais enviado(s)`);
      }
      
      if (summary.failed > 0) {
        toast.warning(`${summary.failed} aluno(s) falharam na importação`);
      }
      
    } catch (err) {
      toast.error('Erro durante a importação');
    }
  };

  const handleClose = () => {
    reset();
    setStep('upload');
    setFile(null);
    setCsvText('');
    setValidationError(null);
    setDuplicateWarnings({ email: [], cpf: [], matricula: [] });
    onOpenChange(false);
    
    if (importSummary && importSummary.succeeded > 0) {
      onComplete?.();
    }
  };

  const validRows = parsedRows.filter(r => r.isValid);
  const invalidRows = parsedRows.filter(r => !r.isValid);
  const minorRows = parsedRows.filter(r => r.isMinor);
  const adultRows = parsedRows.filter(r => !r.isMinor && r.calculatedAge !== null);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Importar Alunos
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {(['upload', 'preview', 'result'] as WizardStep[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step === s 
                  ? "bg-primary text-primary-foreground" 
                  : parsedRows.length > 0 && i < ['upload', 'preview', 'result'].indexOf(step)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}>
                {i + 1}
              </div>
              {i < 2 && (
                <ChevronRight className={cn(
                  "h-4 w-4 mx-2",
                  i < ['upload', 'preview', 'result'].indexOf(step) ? "text-primary" : "text-muted-foreground"
                )} />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">Template de Importação</p>
                    <p className="text-sm text-muted-foreground">
                      Baixe o modelo com todas as colunas suportadas
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar Template
                </Button>
              </div>

              {/* Formato esperado */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Colunas Suportadas</Label>
                <div className="p-3 bg-muted/50 rounded-md text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Badge variant="destructive" className="mr-2">*</Badge> nome</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> email (maior de idade)</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> turma (código)</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> data_nasc</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> telefone</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> matricula</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> cpf</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> responsavel_nome</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> responsavel_telefone</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> responsavel_email (menor)</div>
                    <div><Badge variant="secondary" className="mr-2">?</Badge> senha</div>
                  </div>
                  <div className="mt-3 p-2 bg-primary/10 rounded border border-primary/20">
                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                      <Baby className="h-3 w-3" />
                      Para menores de idade: email do responsável será usado para login
                    </p>
                    <p className="text-xs text-primary flex items-center gap-1 mt-1">
                      <UserCheck className="h-3 w-3" />
                      Para maiores de idade: email próprio obrigatório
                    </p>
                  </div>
                </div>
              </div>

              {/* Modo de importação */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={importMode === 'file' ? 'default' : 'outline'}
                    onClick={() => setImportMode('file')}
                    size="sm"
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant={importMode === 'text' ? 'default' : 'outline'}
                    onClick={() => setImportMode('text')}
                    size="sm"
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Colar Texto
                  </Button>
                </div>

                {importMode === 'file' ? (
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">Selecionar arquivo CSV ou Excel</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls"
                      onChange={handleFileChange}
                    />
                    {file && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        {file.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="csv-text">Conteúdo CSV</Label>
                    <Textarea
                      id="csv-text"
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder="Cole aqui o conteúdo CSV..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              {csvText && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Prévia (primeiras 3 linhas)</Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <pre className="text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                      {csvText.split('\n').slice(0, 3).join('\n')}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border/50 bg-muted/30 text-center">
                  <p className="text-xl font-bold">{parsedRows.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-center">
                  <p className="text-xl font-bold text-green-600">{validRows.length}</p>
                  <p className="text-xs text-muted-foreground">Válidas</p>
                </div>
                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-center">
                  <p className="text-xl font-bold text-blue-600">{minorRows.length}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Baby className="h-3 w-3" /> Menores
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10 text-center">
                  <p className="text-xl font-bold text-purple-600">{adultRows.length}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <UserCheck className="h-3 w-3" /> Maiores
                  </p>
                </div>
              </div>

              {/* Email sending toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Enviar credenciais por email</p>
                    <p className="text-sm text-muted-foreground">
                      Emails serão enviados automaticamente para alunos/responsáveis
                    </p>
                  </div>
                </div>
                <Switch
                  checked={sendEmailsEnabled}
                  onCheckedChange={setSendEmailsEnabled}
                />
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="p-4 rounded-lg border border-red-500/50 bg-red-500/10 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-600">Limite de alunos atingido</p>
                    <p className="text-sm text-red-500">{validationError}</p>
                  </div>
                </div>
              )}

              {/* Invalid rows */}
              {invalidRows.length > 0 && (
                <div className="p-4 rounded-lg border border-red-500/50 bg-red-500/10 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-600">{invalidRows.length} linha(s) com erro</p>
                    <p className="text-sm text-red-500">
                      Essas linhas serão ignoradas na importação
                    </p>
                  </div>
                </div>
              )}

              {/* Duplicate Warnings */}
              {(duplicateWarnings.email.length > 0 || duplicateWarnings.cpf.length > 0) && (
                <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-600">Duplicatas detectadas</p>
                    {duplicateWarnings.email.length > 0 && (
                      <p className="text-sm text-yellow-600">
                        Emails já cadastrados: {duplicateWarnings.email.join(', ')}
                      </p>
                    )}
                    {duplicateWarnings.cpf.length > 0 && (
                      <p className="text-sm text-yellow-600">
                        CPFs já cadastrados: {duplicateWarnings.cpf.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Row Details */}
              <div className="space-y-2">
                <Label>Detalhes das linhas</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left">#</th>
                          <th className="px-2 py-2 text-left">Nome</th>
                          <th className="px-2 py-2 text-left">Idade</th>
                          <th className="px-2 py-2 text-left">Email Login</th>
                          <th className="px-2 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {parsedRows.slice(0, 50).map((row) => (
                          <tr key={row.rowNumber} className={cn(
                            "hover:bg-muted/30",
                            !row.isValid && "bg-red-500/5"
                          )}>
                            <td className="px-2 py-2 text-muted-foreground">{row.rowNumber}</td>
                            <td className="px-2 py-2 font-medium">{row.nome}</td>
                            <td className="px-2 py-2">
                              {row.calculatedAge !== null ? (
                                <Badge variant={row.isMinor ? "secondary" : "outline"} className="text-xs">
                                  {row.isMinor ? (
                                    <span className="flex items-center gap-1">
                                      <Baby className="h-3 w-3" />
                                      {row.calculatedAge}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <UserCheck className="h-3 w-3" />
                                      {row.calculatedAge}
                                    </span>
                                  )}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-xs">
                              <div className="flex flex-col">
                                <span className="truncate max-w-[140px]">{row.loginEmail || row.email}</span>
                                {row.generatedEmail && (
                                  <Badge variant="outline" className="text-[10px] mt-0.5 w-fit">gerado</Badge>
                                )}
                                {row.isMinor && row.responsavel_email && (
                                  <Badge variant="secondary" className="text-[10px] mt-0.5 w-fit">responsável</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              {row.isValid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <div className="flex items-center gap-1">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-xs text-red-500 truncate max-w-[100px]">{row.errors[0]}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedRows.length > 50 && (
                      <p className="text-center py-2 text-sm text-muted-foreground">
                        ... e mais {parsedRows.length - 50} linhas
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Processing / Result */}
          {step === 'result' && (
            <div className="space-y-6">
              {isLoading ? (
                <div className="space-y-4 py-8">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-lg font-medium">Importando alunos...</p>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-center text-sm text-muted-foreground">
                    Processando {currentRow} de {validRows.length} alunos
                  </p>
                </div>
              ) : importSummary ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/30 text-center">
                      <p className="text-xl font-bold">{importSummary.total}</p>
                      <p className="text-xs text-muted-foreground">Processados</p>
                    </div>
                    <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-center">
                      <p className="text-xl font-bold text-green-600">{importSummary.succeeded}</p>
                      <p className="text-xs text-muted-foreground">Sucesso</p>
                    </div>
                    <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-center">
                      <p className="text-xl font-bold text-blue-600">{importSummary.emailsSent}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Mail className="h-3 w-3" /> Emails
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-center">
                      <p className="text-xl font-bold text-red-600">{importSummary.failed}</p>
                      <p className="text-xs text-muted-foreground">Falhas</p>
                    </div>
                  </div>

                  {/* Download Credentials */}
                  {importSummary.succeeded > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-lg border border-green-500/30 bg-green-500/10">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="font-medium text-green-700">Credenciais Geradas</p>
                          <p className="text-sm text-green-600">
                            Baixe o arquivo com emails e senhas como backup
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => downloadCredentials(importSummary.results)}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Download className="h-4 w-4" />
                        Baixar CSV
                      </Button>
                    </div>
                  )}

                  {/* Email summary */}
                  {sendEmailsEnabled && importSummary.emailsSent > 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
                      <Mail className="h-6 w-6 text-blue-500" />
                      <div>
                        <p className="font-medium text-blue-700">
                          {importSummary.emailsSent} email(s) enviado(s) com sucesso
                        </p>
                        {importSummary.emailsFailed > 0 && (
                          <p className="text-sm text-blue-600">
                            {importSummary.emailsFailed} email(s) falharam - credenciais disponíveis no CSV
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Results Table */}
                  <div className="space-y-2">
                    <Label>Resultado detalhado</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="px-2 py-2 text-left">Nome</th>
                              <th className="px-2 py-2 text-left">Email</th>
                              <th className="px-2 py-2 text-left">Tipo</th>
                              <th className="px-2 py-2 text-left">Email</th>
                              <th className="px-2 py-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {importSummary.results.map((result, i) => (
                              <tr key={i} className={cn(
                                "hover:bg-muted/30",
                                !result.success && "bg-red-500/5"
                              )}>
                                <td className="px-2 py-2 font-medium">{result.name}</td>
                                <td className="px-2 py-2 text-xs truncate max-w-[120px]">{result.email}</td>
                                <td className="px-2 py-2">
                                  <Badge variant={result.isMinor ? "secondary" : "outline"} className="text-[10px]">
                                    {result.isMinor ? <Baby className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                                  </Badge>
                                </td>
                                <td className="px-2 py-2">
                                  {result.emailSent ? (
                                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                                  ) : result.success ? (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  ) : null}
                                </td>
                                <td className="px-2 py-2">
                                  {result.success ? (
                                    <Badge className="bg-green-500 text-[10px]">OK</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-[10px]">{result.error}</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t border-border/50">
          <div>
            {step !== 'upload' && step !== 'result' && (
              <Button 
                variant="outline" 
                onClick={() => setStep('upload')}
                disabled={isLoading}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              {step === 'result' ? 'Fechar' : 'Cancelar'}
            </Button>
            
            {step === 'upload' && (
              <Button 
                onClick={handleParse}
                disabled={!csvText.trim()}
                className="gap-2"
              >
                Continuar
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            
            {step === 'preview' && (
              <Button 
                onClick={handleImport}
                disabled={validRows.length === 0 || !!validationError || isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar {validRows.length} aluno(s)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
