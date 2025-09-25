import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Download, Search, Filter } from 'lucide-react';
import { usePostViews, PostView, PostViewSource } from '@/stores/post-views.store';
import { Post } from '@/types/post';
import { User } from '@/types/auth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PostInsightsProps {
  post: Post;
  currentUser: User;
}

// Period filter options
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' }
];

// Role filter options  
const ROLE_OPTIONS = [
  { value: 'all', label: 'Todas as funções' },
  { value: 'aluno', label: 'Alunos' },
  { value: 'professor', label: 'Professores' },
  { value: 'secretaria', label: 'Secretaria' }
];

// Source filter options
const SOURCE_OPTIONS = [
  { value: 'all', label: 'Todas as fontes' },
  { value: 'feed', label: 'Feed' },
  { value: 'calendar', label: 'Calendário' },
  { value: 'notification', label: 'Notificação' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'deep-link', label: 'Link Direto' }
];

// Humanize source
const humanizeSource = (source: PostViewSource): string => {
  const sourceMap = {
    feed: 'Feed',
    calendar: 'Calendário', 
    notification: 'Notificação',
    'deep-link': 'Link Direto',
    dashboard: 'Dashboard'
  };
  return sourceMap[source] || source;
};

// Get user initials
const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Check if user can see insights
const canSeeInsights = (post: Post, user: User): boolean => {
  return user.role === 'secretaria' || post.authorId === user.id;
};

// Filter views by period
const filterViewsByPeriod = (views: PostView[], period: string): PostView[] => {
  if (period === 'all') return views;
  
  const now = new Date();
  const cutoff = new Date();
  
  switch (period) {
    case 'today':
      cutoff.setHours(0, 0, 0, 0);
      break;
    case '7d':
      cutoff.setDate(now.getDate() - 7);
      break;
    case '30d':
      cutoff.setDate(now.getDate() - 30);
      break;
    default:
      return views;
  }
  
  return views.filter(view => new Date(view.viewedAt) >= cutoff);
};

export function PostInsights({ post, currentUser }: PostInsightsProps) {
  const { getViews, getUniqueCount, exportViews, subscribe } = usePostViews();
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [, forceUpdate] = useState({});

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, [subscribe]);

  // Check if user can see insights
  if (!canSeeInsights(post, currentUser)) {
    return null;
  }

  const allViews = getViews(post.id);
  const uniqueCount = getUniqueCount(post.id);
  
  // Apply filters
  const filteredViews = useMemo(() => {
    let views = filterViewsByPeriod(allViews, periodFilter);
    
    // Apply search filter
    if (searchQuery) {
      views = views.filter(view => 
        view.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      views = views.filter(view => view.role === roleFilter);
    }
    
    // Apply source filter  
    if (sourceFilter !== 'all') {
      views = views.filter(view => view.source === sourceFilter);
    }
    
    return views;
  }, [allViews, searchQuery, periodFilter, roleFilter, sourceFilter]);

  const handleExport = () => {
    exportViews(post.id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs bg-muted/50 hover:bg-muted/80 text-muted-foreground hover:text-foreground gap-1"
          title={`${uniqueCount} visualizações únicas`}
        >
          <Eye className="w-3 h-3" />
          <span>{uniqueCount}</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="space-y-3">
          <SheetTitle className="text-left">
            Insights do Post
          </SheetTitle>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground line-clamp-2">
              {post.title}
            </h4>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{uniqueCount}</span>
                <span className="text-muted-foreground">únicos</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">{allViews.length}</span>
                <span> total</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Filters */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Filter selects */}
            <div className="grid grid-cols-2 gap-2">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Função" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export button */}
            {allViews.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="w-full h-9 gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            )}
          </div>

          {/* Views list */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {filteredViews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {allViews.length === 0 
                    ? 'Nenhuma visualização ainda'
                    : 'Nenhuma visualização corresponde aos filtros'
                  }
                </p>
              </div>
            ) : (
              filteredViews.map((view, index) => (
                <div
                  key={`${view.userId}-${view.viewedAt}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border border-border/50",
                    "hover:bg-muted/50 transition-colors"
                  )}
                >
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getUserInitials(view.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {view.name}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(view.viewedAt), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs py-0">
                        {view.role.toUpperCase()}
                      </Badge>
                      
                      {view.classId && (
                        <Badge variant="secondary" className="text-xs py-0">
                          {view.classId}
                        </Badge>
                      )}
                      
                      <Badge variant="secondary" className="text-xs py-0 text-muted-foreground">
                        {humanizeSource(view.source)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}