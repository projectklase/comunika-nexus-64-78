import { useState } from 'react';
import { useGlobalLevelStore, GlobalLevel, GlobalLevelFilters } from '@/stores/global-level-store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CatalogoLevelFormModal } from './CatalogoLevelFormModal';

interface CatalogoLevelsTableProps {
  filters: GlobalLevelFilters;
}

export function CatalogoLevelsTable({ filters }: CatalogoLevelsTableProps) {
  const { toast } = useToast();
  const { getFilteredLevels, deleteLevel, activateLevel, deactivateLevel } = useGlobalLevelStore();
  const [editingLevel, setEditingLevel] = useState<GlobalLevel | null>(null);

  const levels = getFilteredLevels(filters);

  const handleDelete = async (level: GlobalLevel) => {
    if (confirm(`Tem certeza que deseja excluir o nível "${level.name}"?`)) {
      try {
        await deleteLevel(level.id);
        toast({ title: "Nível excluído", description: "O nível foi excluído com sucesso." });
      } catch (error) {
        toast({ title: "Erro", description: "Não foi possível excluir o nível.", variant: "destructive" });
      }
    }
  };

  const handleToggleStatus = async (level: GlobalLevel) => {
    try {
      if (level.isActive) {
        await deactivateLevel(level.id);
        toast({ title: "Nível desativado", description: "O nível foi desativado com sucesso." });
      } else {
        await activateLevel(level.id);
        toast({ title: "Nível ativado", description: "O nível foi ativado com sucesso." });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível alterar o status do nível.", variant: "destructive" });
    }
  };

  if (levels.length === 0) {
    return <div className="text-center py-8"><p className="text-muted-foreground">Nenhum nível encontrado.</p></div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Ordem</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {levels.map((level) => (
            <TableRow key={level.id}>
              <TableCell className="font-medium">{level.name}</TableCell>
              <TableCell>{level.code || '-'}</TableCell>
              <TableCell>{level.order || '-'}</TableCell>
              <TableCell className="max-w-xs truncate">{level.description || '-'}</TableCell>
              <TableCell>
                <Badge variant={level.isActive ? 'default' : 'secondary'}>
                  {level.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card">
                    <DropdownMenuItem onClick={() => setEditingLevel(level)}>
                      <Edit className="mr-2 h-4 w-4" />Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(level)}>
                      {level.isActive ? <><Archive className="mr-2 h-4 w-4" />Desativar</> : <><ArchiveRestore className="mr-2 h-4 w-4" />Ativar</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(level)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CatalogoLevelFormModal open={!!editingLevel} onOpenChange={(open) => !open && setEditingLevel(null)} level={editingLevel} />
    </>
  );
}