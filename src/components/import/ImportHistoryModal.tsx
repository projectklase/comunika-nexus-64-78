import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Search, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useImportHistoryStore } from '@/stores/import-history-store';
import { ImportRecord } from '@/types/import';
import { useSchool } from '@/contexts/SchoolContext';

export function ImportHistoryModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ImportRecord | null>(null);
  
  const { currentSchool } = useSchool();
  const { 
    history, 
    filters, 
    setFilters, 
    getFilteredHistory, 
    loadHistory 
  } = useImportHistoryStore();

  useEffect(() => {
    if (isOpen && currentSchool?.id) {
      loadHistory(currentSchool.id);
    }
  }, [isOpen, currentSchool?.id, loadHistory]);

  const filteredHistory = getFilteredHistory();

  const getTypeLabel = (type: string) => {
    const labels = { turmas: 'Turmas', alunos: 'Alunos', professores: 'Professores' };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusBadge = (record: ImportRecord) => {
    if (record.rowsFailed === 0) {
      return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>;
    }
    if (record.rowsSucceeded > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">Erro</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico de Importações</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 items-center mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome do arquivo..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="pl-10"
            />
          </div>

          <Select
            value={filters.importType || 'all'}
            onValueChange={(value) => setFilters({ search: filters.search, importType: value === 'all' ? undefined : value as any })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="turmas">Turmas</SelectItem>
              <SelectItem value="alunos">Alunos</SelectItem>
              <SelectItem value="professores">Professores</SelectItem>
            </SelectContent>
          </Select>

          {(filters.search || filters.importType) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ search: '', importType: undefined })}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 border rounded-lg overflow-hidden">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Sucesso</TableHead>
                  <TableHead>Erros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma importação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.fileName}</TableCell>
                      <TableCell>{getTypeLabel(record.importType)}</TableCell>
                      <TableCell>{record.rowsProcessed}</TableCell>
                      <TableCell className="text-green-600">{record.rowsSucceeded}</TableCell>
                      <TableCell className="text-red-600">{record.rowsFailed}</TableCell>
                      <TableCell>{getStatusBadge(record)}</TableCell>
                      <TableCell>
                        {new Date(record.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        {record.errorLog.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRecord(record)}
                          >
                            Ver Erros
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Modal de detalhes dos erros */}
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Importação</DialogTitle>
            </DialogHeader>
            
            {selectedRecord && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Arquivo:</strong> {selectedRecord.fileName}
                  </div>
                  <div>
                    <strong>Tipo:</strong> {getTypeLabel(selectedRecord.importType)}
                  </div>
                  <div>
                    <strong>Total de registros:</strong> {selectedRecord.rowsProcessed}
                  </div>
                  <div>
                    <strong>Importados com sucesso:</strong> {selectedRecord.rowsSucceeded}
                  </div>
                </div>

                {selectedRecord.errorLog.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                      Erros encontrados ({selectedRecord.errorLog.length})
                    </h4>
                    <ScrollArea className="h-40 border rounded p-2">
                      <div className="space-y-1">
                        {selectedRecord.errorLog.map((error, index) => (
                          <div key={index} className="text-sm text-red-600">
                            Linha {error.row}: {error.field} - {error.message}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}