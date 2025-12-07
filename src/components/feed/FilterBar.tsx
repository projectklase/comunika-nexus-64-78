import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X, Bookmark, Users, GraduationCap, Building2, Clock, Eye, EyeOff, Settings } from 'lucide-react';
import { PostType, PostStatus } from '@/types/post';
import { useAuth } from '@/contexts/AuthContext';
import { useClassStore } from '@/stores/class-store';
import { useDebounce } from '@/hooks/useDebounce';
import { useFeedFilters, QuickFilter } from '@/hooks/useFeedFilters';
import { DEFAULT_SELECT_TOKENS, useSelectState } from '@/hooks/useSelectState';
import { a11y } from '@/utils/accessibility';
import { SmartPostFilters } from '@/utils/post-filters';
import { useIsMobile } from '@/hooks/use-mobile'; // FASE 3
import { MobileFilterSheet } from './MobileFilterSheet'; // FASE 3
import { cn } from '@/lib/utils';

interface FilterBarProps {
  onFilterChange: (filters: {
    query?: string;
    type?: PostType;
    status?: PostStatus;
    classId?: string;
    saved?: boolean;
    authorRole?: 'secretaria' | 'professor' | 'aluno';
  }) => void;
}

const POST_TYPE_LABELS = {
  AVISO: 'Aviso',
  COMUNICADO: 'Comunicado', 
  EVENTO: 'Evento',
  ATIVIDADE: 'Atividade'
};

const POST_STATUS_LABELS = {
  PUBLISHED: 'Publicado',
  SCHEDULED: 'Agendado',
  ARCHIVED: 'Arquivado'
};

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const { user } = useAuth();
  const { getActiveClasses, getClassesByStudent } = useClassStore();
  const isMobile = useIsMobile(); // FASE 3: Detectar mobile
  
  const { preferences, filters, updatePreferences, updateFilters, applyQuickFilter } = useFeedFilters();
  const [searchInput, setSearchInput] = useState(filters.query || '');
  const [showPreferences, setShowPreferences] = useState(false);
  
  const debouncedQuery = useDebounce(searchInput, 500);
  
  // Get student's classes if user is aluno
  const studentClasses = user?.role === 'aluno' ? getClassesByStudent(user.id) : [];
  const allClasses = user?.role === 'secretaria' ? getActiveClasses() : studentClasses;
  
  // Setup class selector with proper tokens
  const classSelector = useSelectState({
    defaultToken: DEFAULT_SELECT_TOKENS.ALL_CLASSES,
    onValueChange: (value) => {
      updateFilters({ classId: value });
    }
  });

  // Effect to sync debounced search with filters
  useEffect(() => {
    updateFilters({ query: debouncedQuery });
  }, [debouncedQuery]);
  
  // Effect to notify parent of filter changes
  useEffect(() => {
    onFilterChange({
      query: filters.query,
      type: filters.type,
      status: filters.status,
      classId: filters.classId === DEFAULT_SELECT_TOKENS.ALL_CLASSES ? undefined : filters.classId,
      saved: filters.saved,
      authorRole: filters.authorRole
    });
  }, [filters, onFilterChange]);
  
  // Sync class selector with filters
  useEffect(() => {
    classSelector.setValue(filters.classId || DEFAULT_SELECT_TOKENS.ALL_CLASSES);
  }, [filters.classId]);

  const handleQuickFilter = (quickFilter: QuickFilter) => {
    applyQuickFilter(quickFilter);
  };

  // Get quick filters based on user role
  const getQuickFiltersForRole = () => {
    const baseFilters = [
      { key: 'all' as QuickFilter, label: 'Todos', icon: Users }
    ];

    if (user?.role === 'secretaria') {
      return [
        ...baseFilters,
        { key: 'secretaria' as QuickFilter, label: 'Secretaria', icon: Building2 },
        { key: 'professor' as QuickFilter, label: 'Professor', icon: GraduationCap },
        { key: 'scheduled' as QuickFilter, label: 'Agendados', icon: Clock },
        { key: 'saved' as QuickFilter, label: 'Salvos', icon: Bookmark }
      ];
    }

    if (user?.role === 'professor') {
      return [
        ...baseFilters,
        { key: 'secretaria' as QuickFilter, label: 'Secretaria', icon: Building2 },
        { key: 'professor' as QuickFilter, label: 'Minhas Atividades', icon: GraduationCap },
        { key: 'scheduled' as QuickFilter, label: 'Agendados', icon: Clock },
        { key: 'saved' as QuickFilter, label: 'Salvos', icon: Bookmark }
      ];
    }

    // Default for aluno
    return [
      ...baseFilters,
      { key: 'secretaria' as QuickFilter, label: 'Secretaria', icon: Building2 },
      { key: 'professor' as QuickFilter, label: 'Professor', icon: GraduationCap },
      { key: 'pending' as QuickFilter, label: 'Pendentes', icon: Clock },
      { key: 'saved' as QuickFilter, label: 'Salvos', icon: Bookmark }
    ];
  };

  const getQuickFilterLabel = () => {
    const filterMap: Record<QuickFilter, string> = {
      all: 'Todos',
      secretaria: 'Secretaria', 
      professor: user?.role === 'professor' ? 'Minhas Atividades' : 'Professor',
      pending: 'Pendentes',
      saved: 'Salvos',
      scheduled: 'Agendados'
    };
    return filterMap[filters.quickFilter || 'all'];
  };

  const clearAllFilters = () => {
    setSearchInput('');
    updateFilters({
      query: '',
      type: undefined,
      status: undefined,
      classId: DEFAULT_SELECT_TOKENS.ALL_CLASSES,
      saved: undefined,
      quickFilter: 'all'
    });
  };

  // FASE 3: Contar filtros ativos para badge mobile
  const countActiveFilters = () => {
    let count = 0;
    if (filters.query) count++;
    if (!classSelector.isDefault()) count++;
    if (filters.quickFilter !== 'all') count++;
    if (preferences.hideRead) count++;
    return count;
  };

  // Conteúdo dos filtros avançados (reutilizável em mobile sheet)
  const advancedFiltersContent = (
    <>
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, autor..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10 h-10 w-full bg-background/50 border-border/50"
          aria-label="Campo de busca"
        />
      </div>

      {/* Class Filter */}
      <Select 
        value={classSelector.value} 
        onValueChange={classSelector.setValue}
        disabled={allClasses.length === 0}
      >
        <SelectTrigger 
          className="w-full sm:w-[180px] h-10 bg-background/50 border-border/50"
          aria-label="Selecionar turma"
        >
          <SelectValue placeholder="Turma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_CLASSES}>
            {allClasses.length === 0 ? 'Nenhuma turma atribuída' : 'Todas as turmas'}
          </SelectItem>
          {allClasses.map(cls => (
            <SelectItem key={cls.id} value={cls.id}>
              {cls.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      <Button
        variant="outline"
        size="sm"
        onClick={clearAllFilters}
        className="h-10 w-full sm:w-auto"
        disabled={!filters.query && filters.quickFilter === 'all' && classSelector.isDefault()}
        aria-label="Limpar todos os filtros"
      >
        <X className="h-4 w-4 mr-2" />
        Limpar
      </Button>
    </>
  );

  // FASE 3: Preferências content (reutilizável)
  const preferencesContent = (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Preferências de Visualização</CardTitle>
        <CardDescription className="text-xs">Configure como deseja ver o feed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="hide-read" className="text-xs">Ocultar posts lidos</Label>
          <Switch
            id="hide-read"
            checked={preferences.hideRead}
            onCheckedChange={(checked) => updatePreferences({ hideRead: checked })}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="hide-expired" className="text-xs">Ocultar posts passados</Label>
          <Switch
            id="hide-expired"
            checked={preferences.hideExpired ?? true}
            onCheckedChange={(checked) => updatePreferences({ hideExpired: checked })}
          />
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label className="text-xs">Ordenar por</Label>
          <Select 
            value={preferences.sortBy} 
            onValueChange={(value: 'relevant' | 'recent') => updatePreferences({ sortBy: value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevant">Mais relevantes (inteligente)</SelectItem>
              <SelectItem value="recent">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label className="text-xs">Posts por página</Label>
          <Select 
            value={preferences.pageSize.toString()} 
            onValueChange={(value) => updatePreferences({ pageSize: parseInt(value) })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 posts</SelectItem>
              <SelectItem value="10">10 posts</SelectItem>
              <SelectItem value="20">20 posts</SelectItem>
              <SelectItem value="50">50 posts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full space-y-3">
      {/* Quick Filters - Com scroll horizontal suave */}
      <div className="w-full -mx-3 sm:mx-0">
        <div className="overflow-x-auto px-3 sm:px-0">
          <div className="flex gap-2 pb-2 w-max sm:w-full">
            {getQuickFiltersForRole().map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={filters.quickFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickFilter(key)}
                className="shrink-0 h-9 px-3 text-xs whitespace-nowrap"
                aria-pressed={filters.quickFilter === key}
                aria-label={`Filtro ${label}`}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Search + Filtros */}
      <div className="flex gap-2 w-full">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar posts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 h-9 w-full bg-background/50 border-border/50"
              aria-label="Campo de busca"
            />
          </div>
        </div>
        
        {/* Mobile: Sheet de filtros */}
        {isMobile ? (
          <MobileFilterSheet activeFiltersCount={countActiveFilters()}>
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Filtros Avançados</h4>
                {advancedFiltersContent}
              </div>
              <Separator className="my-4" />
              <div>
                <h4 className="font-medium text-sm mb-3">Preferências</h4>
                {preferencesContent}
              </div>
            </div>
          </MobileFilterSheet>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreferences(!showPreferences)}
            className="h-10 px-3 shrink-0"
            aria-label="Preferências"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Desktop: Preferências inline */}
      {!isMobile && showPreferences && preferencesContent}

      {/* Desktop: Filtros avançados inline */}
      {!isMobile && (
        <div className="flex items-center gap-3 flex-wrap">
          <Select 
            value={classSelector.value} 
            onValueChange={classSelector.setValue}
            disabled={allClasses.length === 0}
          >
            <SelectTrigger className="w-[180px] h-10 bg-background/50 border-border/50">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_CLASSES}>
                {allClasses.length === 0 ? 'Nenhuma turma' : 'Todas as turmas'}
              </SelectItem>
              {allClasses.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="h-10"
            disabled={!filters.query && filters.quickFilter === 'all' && classSelector.isDefault()}
          >
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      )}

      {/* Active Filters Badges */}
      {(filters.query || !classSelector.isDefault() || filters.quickFilter !== 'all') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filtros:</span>
          <Badge variant="secondary" className="shrink-0 text-xs bg-primary/20 text-primary">
            {getQuickFilterLabel()}
          </Badge>
          {filters.query && (
            <Badge variant="secondary" className="shrink-0 text-xs">"{filters.query}"</Badge>
          )}
          {!classSelector.isDefault() && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {allClasses.find(c => c.id === filters.classId)?.name}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}