import { useState } from 'react';
import { Post, ActivityType } from '@/types/post';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';
import { useActivityExport } from '@/hooks/useActivityExport';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, FolderOpen, ClipboardCheck, MoreHorizontal, Download, Eye, Edit, Copy, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface ActivityTableProps {
  activities: Post[];
  showSelection?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  className?: string;
}

const typeConfig = {
  ATIVIDADE: { label: 'Atividade', icon: FileText, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  TRABALHO: { label: 'Trabalho', icon: FolderOpen, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  PROVA: { label: 'Prova', icon: ClipboardCheck, color: 'bg-red-500/20 text-red-400 border-red-500/30' }
};

export function ActivityTable({ 
  activities, 
  showSelection = false, 
  onSelectionChange,
  className 
}: ActivityTableProps) {
  const weightsEnabled = useWeightsEnabled();
  const { exportActivities } = useActivityExport();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    const newSelection = checked ? activities.map(a => a.id) : [];
    setSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectActivity = (activityId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...selectedIds, activityId]
      : selectedIds.filter(id => id !== activityId);
    setSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const formatDueDate = (dueAt?: string) => {
    if (!dueAt) return '-';
    return format(new Date(dueAt), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const formatWeight = (meta?: any) => {
    if (!weightsEnabled || !meta?.peso || meta?.usePeso === false) {
      return '-';
    }
    return meta.peso.toString();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} atividade(s) selecionada(s)
          </span>
          <Button
            size="sm"
            onClick={() => exportActivities(activities.filter(a => selectedIds.includes(a.id)))}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Selecionadas
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === activities.length && activities.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Prazo</TableHead>
              {weightsEnabled && <TableHead className="w-20">Peso</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={weightsEnabled ? 7 : 6} 
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhuma atividade encontrada
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => {
                const config = typeConfig[activity.type as keyof typeof typeConfig];
                const Icon = config.icon;

                return (
                  <TableRow key={activity.id}>
                    {showSelection && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(activity.id)}
                          onCheckedChange={(checked) => handleSelectActivity(activity.id, !!checked)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className={cn('flex items-center gap-1 w-fit', config.color)}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{activity.title}</div>
                      {activity.body && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {activity.body}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDueDate(activity.dueAt)}
                    </TableCell>
                    {weightsEnabled && (
                      <TableCell>
                        {formatWeight(activity.activityMeta)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={activity.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                        {activity.status === 'PUBLISHED' ? 'Publicado' : 
                         activity.status === 'SCHEDULED' ? 'Agendado' : 'Arquivado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/professor/atividade/${activity.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="h-4 w-4 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}