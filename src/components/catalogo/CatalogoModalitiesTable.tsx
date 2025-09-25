import { useState } from 'react';
import { useGlobalModalityStore, GlobalModality, GlobalModalityFilters } from '@/stores/global-modality-store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CatalogoModalityFormModal } from './CatalogoModalityFormModal';

interface CatalogoModalitiesTableProps {
  filters: GlobalModalityFilters;
}

export function CatalogoModalitiesTable({ filters }: CatalogoModalitiesTableProps) {
  const { toast } = useToast();
  const { getFilteredModalities, deleteModality, activateModality, deactivateModality } = useGlobalModalityStore();
  const [editingModality, setEditingModality] = useState<GlobalModality | null>(null);

  const modalities = getFilteredModalities(filters);

  const handleDelete = async (modality: GlobalModality) => {
    if (confirm(`Tem certeza que deseja excluir a modalidade "${modality.name}"?`)) {
      try {
        await deleteModality(modality.id);
        toast({ title: "Modalidade excluída", description: "A modalidade foi excluída com sucesso." });
      } catch (error) {
        toast({ title: "Erro", description: "Não foi possível excluir a modalidade.", variant: "destructive" });
      }
    }
  };

  const handleToggleStatus = async (modality: GlobalModality) => {
    try {
      if (modality.isActive) {
        await deactivateModality(modality.id);
        toast({ title: "Modalidade desativada", description: "A modalidade foi desativada com sucesso." });
      } else {
        await activateModality(modality.id);
        toast({ title: "Modalidade ativada", description: "A modalidade foi ativada com sucesso." });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível alterar o status da modalidade.", variant: "destructive" });
    }
  };

  if (modalities.length === 0) {
    return <div className="text-center py-8"><p className="text-muted-foreground">Nenhuma modalidade encontrada.</p></div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modalities.map((modality) => (
            <TableRow key={modality.id}>
              <TableCell className="font-medium">{modality.name}</TableCell>
              <TableCell>{modality.code || '-'}</TableCell>
              <TableCell className="max-w-xs truncate">{modality.description || '-'}</TableCell>
              <TableCell>
                <Badge variant={modality.isActive ? 'default' : 'secondary'}>
                  {modality.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card">
                    <DropdownMenuItem onClick={() => setEditingModality(modality)}>
                      <Edit className="mr-2 h-4 w-4" />Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(modality)}>
                      {modality.isActive ? <><Archive className="mr-2 h-4 w-4" />Desativar</> : <><ArchiveRestore className="mr-2 h-4 w-4" />Ativar</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(modality)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CatalogoModalityFormModal open={!!editingModality} onOpenChange={(open) => !open && setEditingModality(null)} modality={editingModality} />
    </>
  );
}