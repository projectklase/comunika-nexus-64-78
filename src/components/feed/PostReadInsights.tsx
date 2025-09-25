import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, Download, Search } from 'lucide-react';
import { usePostReads, PostRead } from '@/stores/post-reads.store';
import { Post } from '@/types/post';
import { User } from '@/types/auth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PostReadInsightsProps {
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

// Get user initials
const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Check if user can see read insights
const canSeeReadInsights = (post: Post, user: User): boolean => {
  return user.role === 'secretaria' || post.authorId === user.id;
};

// Filter reads by period
const filterReadsByPeriod = (reads: PostRead[], period: string): PostRead[] => {
  if (period === 'all') return reads;
  
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
      return reads;
  }
  
  return reads.filter(read => new Date(read.readAt) >= cutoff);
};

export function PostReadInsights({ post, currentUser }: PostReadInsightsProps) {
  const { getReads, getUniqueCount, exportReads, subscribe } = usePostReads();
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [, forceUpdate] = useState({});

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, [subscribe]);

  // Check if user can see read insights
  if (!canSeeReadInsights(post, currentUser)) {
    return null;
  }

  const allReads = getReads(post.id);
  const uniqueCount = getUniqueCount(post.id);
  
  // Apply filters
  const filteredReads = useMemo(() => {
    let reads = filterReadsByPeriod(allReads, periodFilter);
    
    // Apply search filter
    if (searchQuery) {
      reads = reads.filter(read => 
        read.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      reads = reads.filter(read => read.role === roleFilter);
    }
    
    return reads;
  }, [allReads, searchQuery, periodFilter, roleFilter]);

  const handleExport = () => {
    exportReads(post.id);
  };

  // Don't show if no reads
  if (uniqueCount === 0) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-600 hover:text-green-500 gap-1 border border-green-500/20"
          title={`${uniqueCount} marcaram como lido`}
        >
          <CheckCircle className="w-3 h-3" />
          <span>{uniqueCount}</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="space-y-3">
          <SheetTitle className="text-left">
            Leituras do Post
          </SheetTitle>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground line-clamp-2">
              {post.title}
            </h4>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-medium">{uniqueCount}</span>
                <span className="text-muted-foreground">leram</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">{allReads.length}</span>
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

            {/* Export button */}
            {allReads.length > 0 && (
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

          {/* Reads list */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {filteredReads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {allReads.length === 0 
                    ? 'Ninguém marcou como lido ainda'
                    : 'Nenhuma leitura corresponde aos filtros'
                  }
                </p>
              </div>
            ) : (
              filteredReads.map((read, index) => (
                <div
                  key={`${read.userId}-${read.readAt}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border border-border/50",
                    "hover:bg-muted/50 transition-colors"
                  )}
                >
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs bg-green-500/10 text-green-600">
                      {getUserInitials(read.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {read.name}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(read.readAt), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs py-0 bg-green-500/10 text-green-600 border-green-500/30">
                        {read.role.toUpperCase()}
                      </Badge>
                      
                      {read.classId && (
                        <Badge variant="secondary" className="text-xs py-0">
                          {read.classId}
                        </Badge>
                      )}
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