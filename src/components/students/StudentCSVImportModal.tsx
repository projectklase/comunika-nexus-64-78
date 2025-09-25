import { useState } from 'react';
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
import { usePeopleStore } from '@/stores/people-store';
import { useCSVImport } from '@/hooks/useCSVImport';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

interface StudentCSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentCSVImportModal({ open, onOpenChange }: StudentCSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'text'>('file');

  const { importStudents } = usePeopleStore();

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

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast.error('Selecione um arquivo ou cole o conteúdo CSV');
      return;
    }

    setLoading(true);
    try {
      const newStudents = await importStudents(csvText);
      toast.success(`${newStudents.length} aluno(s) importado(s) com sucesso`);
      onOpenChange(false);
      setFile(null);
      setCsvText('');
    } catch (error) {
      toast.error('Erro ao importar alunos');
    } finally {
      setLoading(false);
    }
  };

  const exampleCSV = `João Silva;joao.silva@exemplo.com;7A-2025,8B-2025
Maria Santos;maria.santos@exemplo.com;7A-2025
Pedro Oliveira;;9C-2025`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Alunos via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formato esperado */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Formato esperado</Label>
            <div className="p-3 bg-muted/50 rounded-md text-sm">
              <p className="font-medium mb-2">Colunas (separadas por ponto e vírgula):</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>nome</strong> - Nome completo do aluno (obrigatório)</li>
                <li><strong>email</strong> - Email do aluno (opcional, pode ficar vazio)</li>
                <li><strong>turmas</strong> - Códigos das turmas separados por vírgula (opcional)</li>
              </ul>
            </div>
          </div>

          {/* Exemplo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Exemplo</Label>
            <pre className="p-3 bg-muted/50 rounded-md text-sm font-mono overflow-x-auto">
              {exampleCSV}
            </pre>
          </div>

          {/* Modo de importação */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                type="button"
                variant={importMode === 'file' ? 'default' : 'outline'}
                onClick={() => setImportMode('file')}
                size="sm"
              >
                Upload de Arquivo
              </Button>
              <Button
                type="button"
                variant={importMode === 'text' ? 'default' : 'outline'}
                onClick={() => setImportMode('text')}
                size="sm"
              >
                Colar Texto
              </Button>
            </div>

            {importMode === 'file' ? (
              <div className="space-y-2">
                <Label htmlFor="csv-file">Selecionar arquivo CSV</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {file.name}
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
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </div>

          {/* Preview */}
          {csvText && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prévia (primeiras 3 linhas)</Label>
              <div className="p-3 bg-muted/50 rounded-md">
                <pre className="text-sm font-mono overflow-x-auto">
                  {csvText.split('\n').slice(0, 3).join('\n')}
                </pre>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleImport}
              disabled={loading || !csvText.trim()}
              className="gap-2"
            >
              {loading ? (
                'Importando...'
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar Alunos
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}