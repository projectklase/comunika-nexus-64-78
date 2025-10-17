import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RedemptionRequest } from '@/types/rewards';
import { Calendar, Coins, User, CheckCircle2, XCircle, AlertCircle, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RedemptionHistoryProps {
  redemptions: RedemptionRequest[];
}

export function RedemptionHistory({ redemptions }: RedemptionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'APPROVED' | 'REJECTED'>('all');

  // Filtrar apenas resgates processados (não PENDING)
  const processedRedemptions = redemptions.filter(r => r.status !== 'PENDING');

  // Aplicar filtros
  const filteredRedemptions = processedRedemptions.filter(r => {
    const matchesSearch = searchTerm === '' ||
      r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.studentName && r.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all';

  const getStatusBadge = (status: RedemptionRequest['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Recusado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Histórico de Resgates
          {filteredRedemptions.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {filteredRedemptions.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aluno ou item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="APPROVED">Aprovados</SelectItem>
              <SelectItem value="REJECTED">Recusados</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearFilters}
              title="Limpar filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* History List */}
        {filteredRedemptions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">Nenhum resgate encontrado</p>
            <p className="text-sm">
              {hasActiveFilters 
                ? 'Tente ajustar os filtros de busca'
                : 'Resgates processados aparecerão aqui'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRedemptions
              .sort((a, b) => {
                const dateA = a.processedAt ? new Date(a.processedAt).getTime() : 0;
                const dateB = b.processedAt ? new Date(b.processedAt).getTime() : 0;
                return dateB - dateA; // Mais recentes primeiro
              })
              .map((redemption) => (
                <div
                  key={redemption.id}
                  className="flex flex-col gap-4 p-4 bg-muted/5 rounded-lg border border-border/50 hover:bg-muted/10 transition-colors"
                >
                  {/* Header: Status + Data */}
                  <div className="flex items-center justify-between">
                    {getStatusBadge(redemption.status)}
                    <span className="text-xs text-muted-foreground">
                      {redemption.processedAt ? (
                        <>
                          Processado em {format(new Date(redemption.processedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </>
                      ) : (
                        'Data de processamento não disponível'
                      )}
                    </span>
                  </div>

                  {/* Main Content */}
                  <div className="flex items-start gap-4">
                    {/* Student Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {redemption.studentName?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">
                          {redemption.studentName || 'Aluno desconhecido'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          Resgatou: {redemption.itemName}
                        </p>
                      </div>
                    </div>

                    {/* Koin Amount */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span className="font-bold text-base">
                        {redemption.koinAmount}
                      </span>
                    </div>
                  </div>

                  {/* Footer: Processed By */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-3">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>
                        Processado por: <span className="font-semibold">
                          {redemption.processedByName || 'Sistema'}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Solicitado em {format(new Date(redemption.requestedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {/* Rejection Reason (if applicable) */}
                  {redemption.status === 'REJECTED' && redemption.rejectionReason && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
                      <p className="text-xs font-semibold text-destructive mb-1">
                        Motivo da recusa:
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {redemption.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
