import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePeopleStore } from '@/stores/people-store';
import { useClassStore } from '@/stores/class-store';
import { useToast } from '@/hooks/use-toast';
import { FileUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface TeacherCSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CSVRow {
  [key: string]: string;
}

const COLUMN_MAPPINGS = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  document: 'Documento',
  specialties: 'Especialidades',
  class_codes: 'Códigos das Turmas'
};

export function TeacherCSVImportModal({ open, onOpenChange }: TeacherCSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const { createTeacher } = usePeopleStore();
  const { classes, updateClass } = useClassStore();
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (uploadedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    if (!uploadedFile.name.endsWith('.csv')) {
      toast({
        title: "Formato inválido",
        description: "Apenas arquivos CSV são aceitos.",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n').filter(line => line.trim());
      const csvHeaders = lines[0].split(';').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(';');
        const row: CSVRow = {};
        csvHeaders.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        return row;
      });

      setHeaders(csvHeaders);
      setCsvData(rows);
      setStep('mapping');
    };
    reader.readAsText(uploadedFile, 'utf-8');
  };

  const handleMapping = () => {
    const mappedData = csvData.map(row => {
      const mapped: any = {};
      Object.entries(columnMappings).forEach(([csvColumn, mappedField]) => {
        if (mappedField && row[csvColumn]) {
          if (mappedField === 'specialties' || mappedField === 'class_codes') {
            mapped[mappedField] = row[csvColumn].split(',').map(s => s.trim()).filter(s => s);
          } else if (mappedField === 'phone') {
            mapped.phones = [row[csvColumn]];
          } else {
            mapped[mappedField] = row[csvColumn];
          }
        }
      });
      return mapped;
    });

    // Check for warnings
    const newWarnings: string[] = [];
    mappedData.forEach((data, index) => {
      if (!data.name) {
        newWarnings.push(`Linha ${index + 2}: Nome é obrigatório`);
      }
      if (data.class_codes) {
        data.class_codes.forEach((code: string) => {
          if (!classes.find(c => c.code === code)) {
            newWarnings.push(`Linha ${index + 2}: Código de turma "${code}" não encontrado`);
          }
        });
      }
    });

    setWarnings(newWarnings);
    setPreviewData(mappedData);
    setStep('preview');
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      let successCount = 0;
      for (const data of previewData) {
        if (!data.name) continue;

        const teacher = await createTeacher({
          name: data.name,
          role: 'PROFESSOR',
          isActive: true,
          teacher: {
            email: data.email,
            phones: data.phones,
            document: data.document,
            specialties: data.specialties,
          }
        });

        // Vincular às turmas
        if (data.class_codes) {
          for (const code of data.class_codes) {
            const schoolClass = classes.find(c => c.code === code && c.status === 'ATIVA');
            if (schoolClass && !schoolClass.teachers.includes(teacher.id)) {
              await updateClass(schoolClass.id, {
                teachers: [...schoolClass.teachers, teacher.id]
              });
            }
          }
        }
        successCount++;
      }

      toast({
        title: "Importação concluída",
        description: `${successCount} professor(es) importado(s) com sucesso.`,
      });

      onOpenChange(false);
      resetModal();
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar os professores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setColumnMappings({});
    setStep('upload');
    setPreviewData([]);
    setWarnings([]);
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <Label htmlFor="csv-upload" className="cursor-pointer">
          <div className="space-y-2">
            <p className="text-lg font-medium">Clique para selecionar arquivo CSV</p>
            <p className="text-sm text-muted-foreground">
              Máximo 5MB • Formato: name;email;phone;document;specialties;class_codes
            </p>
          </div>
        </Label>
        <Input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
      
      {file && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Arquivo "{file.name}" carregado com {csvData.length} registro(s).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="font-medium">Mapeamento de Colunas</h3>
        {headers.map((header) => (
          <div key={header} className="grid grid-cols-2 gap-4 items-center">
            <Label className="text-sm font-medium">{header}</Label>
            <Select
              value={columnMappings[header] || 'IGNORE'}
              onValueChange={(value) => 
                setColumnMappings(prev => ({ ...prev, [header]: value === 'IGNORE' ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar campo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IGNORE">Ignorar</SelectItem>
                {Object.entries(COLUMN_MAPPINGS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('upload')}>
          Voltar
        </Button>
        <Button onClick={handleMapping}>
          Próximo
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="max-h-64 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Especialidades</TableHead>
              <TableHead>Turmas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.slice(0, 10).map((data, index) => (
              <TableRow key={index}>
                <TableCell>{data.name || '-'}</TableCell>
                <TableCell>{data.email || '-'}</TableCell>
                <TableCell>{data.phones?.[0] || '-'}</TableCell>
                <TableCell>
                  {data.specialties?.map((spec: string, i: number) => (
                    <Badge key={i} variant="secondary" className="mr-1">
                      {spec}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell>
                  {data.class_codes?.map((code: string, i: number) => (
                    <Badge key={i} variant="outline" className="mr-1">
                      {code}
                    </Badge>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {previewData.length > 10 && (
          <p className="text-sm text-muted-foreground mt-2">
            Mostrando 10 de {previewData.length} registros
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('mapping')}>
          Voltar
        </Button>
        <Button onClick={handleImport} disabled={loading}>
          {loading ? 'Importando...' : 'Importar Professores'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Professores - CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && renderUploadStep()}
        {step === 'mapping' && renderMappingStep()}
        {step === 'preview' && renderPreviewStep()}
      </DialogContent>
    </Dialog>
  );
}