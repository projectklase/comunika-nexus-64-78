import { AuditFilters } from '@/types/audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Search } from 'lucide-react';
import { UserSearchCombobox } from './UserSearchCombobox';
import { useClassStore } from '@/stores/class-store';

interface MobileFiltersSheetProps {
  filters: AuditFilters;
  onFilterChange: (key: keyof AuditFilters, value: any) => void;
  activeFiltersCount: number;
}

export function MobileFiltersSheet({ filters, onFilterChange, activeFiltersCount }: MobileFiltersSheetProps) {
  const { getActiveClasses } = useClassStore();
  const classes = getActiveClasses();
  
  const clearAllFilters = () => {
    onFilterChange('entity', 'ALL_ENTITIES');
    onFilterChange('action', 'ALL_ACTIONS');
    onFilterChange('actor_id', 'ALL_USERS');
    onFilterChange('class_id', 'ALL_CLASSES');
    onFilterChange('post_type', 'ALL_POST_TYPES');
  };
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="glass-button relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 h-5 px-1.5 text-xs bg-primary">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] glass-card">
        <SheetHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
            </SheetTitle>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <div className="space-y-4 py-4 overflow-y-auto max-h-[calc(85vh-100px)]">
          {/* Usuário */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Usuário</label>
            <UserSearchCombobox
              value={filters.actor_id || 'ALL_USERS'}
              onSelect={(value) => onFilterChange('actor_id', value)}
            />
          </div>
          
          {/* Entidade */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Entidade</label>
            <Select 
              value={filters.entity || 'ALL_ENTITIES'} 
              onValueChange={(value) => onFilterChange('entity', value)}
            >
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="ALL_ENTITIES">Todas as entidades</SelectItem>
                <SelectItem value="POST">Posts</SelectItem>
                <SelectItem value="CLASS">Turmas</SelectItem>
                <SelectItem value="STUDENT">Alunos</SelectItem>
                <SelectItem value="TEACHER">Professores</SelectItem>
                <SelectItem value="MEMBERSHIP">Vínculos</SelectItem>
                <SelectItem value="SUBJECT">Matérias</SelectItem>
                <SelectItem value="LEVEL">Níveis</SelectItem>
                <SelectItem value="MODALIDADE">Modalidades</SelectItem>
                <SelectItem value="PROGRAM">Programas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Ação */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ação</label>
            <Select 
              value={filters.action || 'ALL_ACTIONS'} 
              onValueChange={(value) => onFilterChange('action', value)}
            >
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="ALL_ACTIONS">Todas as ações</SelectItem>
                <SelectItem value="CREATE">Criação</SelectItem>
                <SelectItem value="UPDATE">Edição</SelectItem>
                <SelectItem value="DELETE">Remoção</SelectItem>
                <SelectItem value="ARCHIVE">Arquivamento</SelectItem>
                <SelectItem value="PUBLISH">Publicação</SelectItem>
                <SelectItem value="SCHEDULE">Agendamento</SelectItem>
                <SelectItem value="ASSIGN">Atribuição</SelectItem>
                <SelectItem value="IMPORT">Importação</SelectItem>
                <SelectItem value="EXPORT">Exportação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Turma */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Turma</label>
            <Select 
              value={filters.class_id || 'ALL_CLASSES'} 
              onValueChange={(value) => onFilterChange('class_id', value)}
            >
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="ALL_CLASSES">Todas as turmas</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Tipo de Post */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Post</label>
            <Select 
              value={filters.post_type || 'ALL_POST_TYPES'} 
              onValueChange={(value) => onFilterChange('post_type', value)}
            >
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="ALL_POST_TYPES">Todos os tipos</SelectItem>
                <SelectItem value="AVISO">Aviso</SelectItem>
                <SelectItem value="COMUNICADO">Comunicado</SelectItem>
                <SelectItem value="EVENTO">Evento</SelectItem>
                <SelectItem value="ATIVIDADE">Atividade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="border-t border-border/50 pt-4">
          <SheetClose asChild>
            <Button className="w-full glass-button">
              Aplicar Filtros
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
