import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Filter,
  Search,
  Calendar as CalendarIcon, 
  Clock, 
  Coffee, 
  Eye, 
  EyeOff,
  Users,
  BookOpen,
  AlertTriangle,
  Zap,
  SlidersHorizontal,
  X,
  ChevronDown,
  FileText,
  GraduationCap,
  User,
  Star,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PostType } from '@/types/post';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { useWeightsEnabled } from '@/hooks/useWeightsEnabled';

export interface AdvancedFilters {
  // Tipos básicos
  events: boolean;
  deadlines: boolean;
  
  // Tipos específicos de posts
  postTypes: PostType[];
  
  // Status e tempo
  overdue: boolean;
  upcoming: boolean;
  thisWeek: boolean;
  
  // Autores
  authorNames: string[];
  
  // Classes
  classIds: string[];
  
  // Peso/Prioridade
  hasWeight: boolean;
  minWeight?: number;
  maxWeight?: number;
  
  // Busca
  searchQuery: string;
  
  // Outros
  hasAttachments: boolean;
  showHolidays: boolean;
}

interface AdvancedCalendarFiltersProps {
  activeFilters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  eventCount: number;
  deadlineCount: number;
  totalCount: number;
}

const POST_TYPE_CONFIG = {
  AVISO: { label: 'Avisos', icon: AlertTriangle, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  COMUNICADO: { label: 'Comunicados', icon: FileText, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  EVENTO: { label: 'Eventos', icon: CalendarIcon, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  ATIVIDADE: { label: 'Atividades', icon: BookOpen, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  TRABALHO: { label: 'Trabalhos', icon: GraduationCap, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  PROVA: { label: 'Provas', icon: Target, color: 'bg-red-500/20 text-red-400 border-red-500/30' }
};

export function AdvancedCalendarFilters({
  activeFilters,
  onFiltersChange,
  eventCount,
  deadlineCount,
  totalCount
}: AdvancedCalendarFiltersProps) {
  const { user } = useAuth();
  const classes = useClassStore(state => state.classes);
  const getTeachers = usePeopleStore(state => state.getTeachers);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const weightsEnabled = useWeightsEnabled();

  // Get teachers safely without causing re-renders
  const teachers = getTeachers();

  const updateFilters = useCallback((updates: Partial<AdvancedFilters>) => {
    onFiltersChange({ ...activeFilters, ...updates });
  }, [onFiltersChange]);

  const togglePostType = (type: PostType) => {
    const newTypes = activeFilters.postTypes.includes(type)
      ? activeFilters.postTypes.filter(t => t !== type)
      : [...activeFilters.postTypes, type];
    updateFilters({ postTypes: newTypes });
  };

  const toggleClass = (classId: string) => {
    const newClasses = activeFilters.classIds.includes(classId)
      ? activeFilters.classIds.filter(id => id !== classId)
      : [...activeFilters.classIds, classId];
    updateFilters({ classIds: newClasses });
  };

  const toggleAuthor = (authorName: string) => {
    const newAuthors = activeFilters.authorNames.includes(authorName)
      ? activeFilters.authorNames.filter(name => name !== authorName)
      : [...activeFilters.authorNames, authorName];
    updateFilters({ authorNames: newAuthors });
  };

  const clearAllFilters = () => {
    updateFilters({
      events: true,
      deadlines: true,
      postTypes: [],
      overdue: false,
      upcoming: false,
      thisWeek: false,
      authorNames: [],
      classIds: [],
      hasWeight: false,
      minWeight: undefined,
      maxWeight: undefined,
      searchQuery: '',
      hasAttachments: false,
      showHolidays: true
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (!activeFilters.events || !activeFilters.deadlines) count++;
    if (activeFilters.postTypes.length > 0) count++;
    if (activeFilters.overdue || activeFilters.upcoming || activeFilters.thisWeek) count++;
    if (activeFilters.authorNames.length > 0) count++;
    if (activeFilters.classIds.length > 0) count++;
    if (activeFilters.hasWeight) count++;
    if (activeFilters.searchQuery) count++;
    if (activeFilters.hasAttachments) count++;
    if (!activeFilters.showHolidays) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="space-y-4">
      {/* Barra de Filtros Principais */}
      <div className="glass-card rounded-lg p-4">
        {/* Linha Superior - Busca e Controles Principais */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Busca Inteligente */}
          <div className={cn(
            "relative flex-1 min-w-[280px] transition-all duration-300",
            searchFocused && "scale-105"
          )}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, conteúdo, autor..."
              value={activeFilters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={cn(
                "pl-10 pr-4 h-10 glass border-primary/30 transition-all duration-300",
                searchFocused && "ring-2 ring-primary/50 border-primary/50"
              )}
            />
            {activeFilters.searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateFilters({ searchQuery: '' })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive/20"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Filtros Avançados Toggle */}
          <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "h-10 px-4 glass border-primary/30 hover:bg-primary/20 transition-all duration-300",
                  activeFilterCount > 0 && "border-accent/50 bg-accent/10"
                )}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtros Avançados
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-accent/20 text-accent">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto glass">
              <DialogHeader>
                <DialogTitle className="gradient-text flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros Avançados do Calendário
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Coluna Esquerda */}
                <div className="space-y-6">
                  {/* Tipos de Conteúdo */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-accent" />
                      Tipos de Conteúdo
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(POST_TYPE_CONFIG) as PostType[]).map((type) => {
                        const config = POST_TYPE_CONFIG[type];
                        const Icon = config.icon;
                        const isActive = activeFilters.postTypes.includes(type);
                        
                        return (
                          <Button
                            key={type}
                            variant={isActive ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => togglePostType(type)}
                            className={cn(
                              "h-9 justify-start gap-2 transition-all duration-200",
                              isActive ? config.color : "hover:bg-accent/10"
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Período */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-accent" />
                      Período
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="overdue"
                          checked={activeFilters.overdue}
                          onCheckedChange={(checked) => updateFilters({ overdue: !!checked })}
                        />
                        <Label htmlFor="overdue" className="text-sm cursor-pointer">
                          <span className="text-red-400">Em atraso</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="thisWeek"
                          checked={activeFilters.thisWeek}
                          onCheckedChange={(checked) => updateFilters({ thisWeek: !!checked })}
                        />
                        <Label htmlFor="thisWeek" className="text-sm cursor-pointer">
                          <span className="text-amber-400">Esta semana</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="upcoming"
                          checked={activeFilters.upcoming}
                          onCheckedChange={(checked) => updateFilters({ upcoming: !!checked })}
                        />
                        <Label htmlFor="upcoming" className="text-sm cursor-pointer">
                          <span className="text-blue-400">Próximos</span>
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Turmas */}
                  {classes.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-accent" />
                        Turmas ({activeFilters.classIds.length} selecionadas)
                      </Label>
                      <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2 glass">
                        {classes.map((cls) => (
                          <div key={cls.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`class-${cls.id}`}
                              checked={activeFilters.classIds.includes(cls.id)}
                              onCheckedChange={() => toggleClass(cls.id)}
                            />
                            <Label htmlFor={`class-${cls.id}`} className="text-sm cursor-pointer">
                              {cls.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna Direita */}
                <div className="space-y-6">
                  {/* Autores */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-accent" />
                      Autores ({activeFilters.authorNames.length} selecionados)
                    </Label>
                    <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2 glass">
                      {teachers.map((teacher) => (
                        <div key={teacher.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`author-${teacher.id}`}
                            checked={activeFilters.authorNames.includes(teacher.name)}
                            onCheckedChange={() => toggleAuthor(teacher.name)}
                          />
                          <Label htmlFor={`author-${teacher.id}`} className="text-sm cursor-pointer">
                            {teacher.name}
                          </Label>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="author-secretaria"
                          checked={activeFilters.authorNames.includes('Secretaria Central')}
                          onCheckedChange={() => toggleAuthor('Secretaria Central')}
                        />
                        <Label htmlFor="author-secretaria" className="text-sm cursor-pointer">
                          Secretaria Central
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Peso/Prioridade - só mostrar se pesos estão habilitados */}
                  {weightsEnabled && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Star className="h-4 w-4 text-accent" />
                        Peso/Prioridade
                      </Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasWeight"
                            checked={activeFilters.hasWeight}
                            onCheckedChange={(checked) => updateFilters({ hasWeight: !!checked })}
                          />
                          <Label htmlFor="hasWeight" className="text-sm cursor-pointer">
                            Apenas com peso definido
                          </Label>
                        </div>
                        {activeFilters.hasWeight && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Peso mínimo</Label>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={activeFilters.minWeight || ''}
                                onChange={(e) => updateFilters({ minWeight: parseFloat(e.target.value) || undefined })}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Peso máximo</Label>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={activeFilters.maxWeight || ''}
                                onChange={(e) => updateFilters({ maxWeight: parseFloat(e.target.value) || undefined })}
                                className="h-8"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Outros */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Outros</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasAttachments"
                          checked={activeFilters.hasAttachments}
                          onCheckedChange={(checked) => updateFilters({ hasAttachments: !!checked })}
                        />
                        <Label htmlFor="hasAttachments" className="text-sm cursor-pointer">
                          Com anexos
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showHolidays"
                          checked={activeFilters.showHolidays}
                          onCheckedChange={(checked) => updateFilters({ showHolidays: !!checked })}
                        />
                        <Label htmlFor="showHolidays" className="text-sm cursor-pointer">
                          Mostrar feriados
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé com Ações */}
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {totalCount} itens encontrados
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearAllFilters}>
                    Limpar Tudo
                  </Button>
                  <Button onClick={() => setShowAdvanced(false)}>
                    Aplicar Filtros
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Resultados */}
          <div className="text-sm text-muted-foreground">
            {totalCount} itens encontrados
          </div>
        </div>

        {/* Linha Inferior - Filtros Básicos */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium text-muted-foreground">
            Exibir:
          </div>

          {/* Events Filter */}
          <Button
            variant={activeFilters.events ? "secondary" : "outline"}
            size="sm"
            onClick={() => updateFilters({ events: !activeFilters.events })}
            className={cn(
              "h-8 gap-2 transition-all duration-200",
              activeFilters.events 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30 neon-glow" 
                : "text-muted-foreground hover:text-amber-400"
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            Eventos
            <Badge variant="outline" className="text-xs">
              {eventCount}
            </Badge>
          </Button>

          {/* Deadlines Filter */}
          <Button
            variant={activeFilters.deadlines ? "secondary" : "outline"}
            size="sm"
            onClick={() => updateFilters({ deadlines: !activeFilters.deadlines })}
            className={cn(
              "h-8 gap-2 transition-all duration-200",
              activeFilters.deadlines 
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30 neon-glow" 
                : "text-muted-foreground hover:text-blue-400"
            )}
          >
            <Clock className="h-3 w-3" />
            Atividades
            <Badge variant="outline" className="text-xs">
              {deadlineCount}
            </Badge>
          </Button>

          {/* Holidays Toggle */}
          <Button
            variant={activeFilters.showHolidays ? "secondary" : "outline"}
            size="sm"
            onClick={() => updateFilters({ showHolidays: !activeFilters.showHolidays })}
            className={cn(
              "h-8 gap-2 transition-all duration-200",
              activeFilters.showHolidays 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "text-muted-foreground hover:text-green-400"
            )}
          >
            <Coffee className="h-3 w-3" />
            Feriados
            {activeFilters.showHolidays ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                {activeFilterCount} filtros ativos
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 w-6 p-0 hover:bg-destructive/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filtros Ativos Resumo */}
      {(activeFilters.searchQuery || activeFilters.postTypes.length > 0 || activeFilters.classIds.length > 0) && (
        <div className="glass-card rounded-lg p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filtros ativos:</span>
            
            {activeFilters.searchQuery && (
              <Badge variant="outline" className="text-xs">
                Busca: "{activeFilters.searchQuery.substring(0, 20)}..."
              </Badge>
            )}
            
            {activeFilters.postTypes.map(type => (
              <Badge key={type} variant="outline" className="text-xs">
                {POST_TYPE_CONFIG[type].label}
              </Badge>
            ))}
            
            {activeFilters.classIds.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {activeFilters.classIds.length} turma(s)
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}