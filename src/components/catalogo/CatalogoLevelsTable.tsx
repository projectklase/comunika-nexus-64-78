import { useState } from 'react';
import { useLevels, Level, LevelFilters } from '@/hooks/useLevels';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CatalogoLevelFormModal } from './CatalogoLevelFormModal';

interface CatalogoLevelsTableProps {
  filters: LevelFilters;
}

export function CatalogoLevelsTable({ filters }: CatalogoLevelsTableProps) {
  const { toast } = useToast();
  const { getFilteredLevels, deleteLevel, updateLevel } = useLevels();
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);

  const levels = getFilteredLevels(filters);

  const handleDelete = async (level: Level) => {
    if (confirm(`Tem certeza que deseja excluir o nível "${level.name}"?`)) {
      try {
        await deleteLevel(level.id);
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const handleToggleStatus = async (level: Level) => {
    try {
      await updateLevel(level.id, { is_active: !level.is_active });
    } catch (error) {
      // Error handling is done in the hook
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
              <TableCell>{level.display_order || '-'}</TableCell>
              <TableCell className="max-w-xs truncate">{level.description || '-'}</TableCell>
              <TableCell>
                <Badge variant={level.is_active ? 'default' : 'secondary'}>
                  {level.is_active ? 'Ativo' : 'Inativo'}
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
                      {level.is_active ? <><Archive className="mr-2 h-4 w-4" />Desativar</> : <><ArchiveRestore className="mr-2 h-4 w-4" />Ativar</>}
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