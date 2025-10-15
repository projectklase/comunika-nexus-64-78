import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardsStore } from '@/stores/rewards-store';
import { RewardCard } from '@/components/rewards/RewardCard';
import { RewardDetailModal } from '@/components/rewards/RewardDetailModal';
import { RedemptionConfirmModal } from '@/components/rewards/RedemptionConfirmModal';
import { KoinHistoryModal } from '@/components/rewards/KoinHistoryModal';
import { RewardsFilters } from '@/components/rewards/RewardsFilters';
import { KoinBalance } from '@/components/rewards/KoinBalance';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RewardItem } from '@/types/rewards';
import { History, Store, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function RewardsStore() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    getFilteredItems,
    searchTerm,
    sortBy,
    setSearchTerm,
    setSortBy,
    getStudentBalance,
    loadStudentBalance,
    loadItems,
    loadTransactions,
    transactions,
    requestRedemption
  } = useRewardsStore();

  const [selectedItem, setSelectedItem] = useState<RewardItem | null>(null);
  const [confirmItem, setConfirmItem] = useState<RewardItem | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('store');

  // Load data on mount
  useEffect(() => {
    loadItems();
    if (user) {
      loadStudentBalance(user.id);
      loadTransactions(user.id);
    }
  }, [user, loadItems, loadStudentBalance, loadTransactions]);

  // Check for URL params to determine active tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'history') {
      setActiveTab('history');
    }
  }, []);

  const items = getFilteredItems();
  const balance = user ? getStudentBalance(user.id) : null;
  const studentTransactions = transactions.filter(t => t.studentId === user?.id);

  const handleRedeem = async (item: RewardItem) => {
    if (!user) return;
    
    setIsProcessing(true);
    
    try {
      const result = await requestRedemption(
        user.id, 
        user.name || 'Aluno', 
        item.id, 
        item.name, 
        item.koinPrice
      );
      
      if (result.success) {
        toast({
          title: "Resgate solicitado!",
          description: result.message,
          duration: 4000
        });
        
        // Reload balance to show blocked amount
        await loadStudentBalance(user.id);
      } else {
        toast({
          title: "Erro no resgate",
          description: result.message,
          variant: "destructive",
          duration: 4000
        });
      }
    } catch (error) {
      toast({
        title: "Erro no resgate",
        description: "Ocorreu um erro ao processar seu resgate",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setIsProcessing(false);
      setConfirmItem(null);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSortBy('name');
  };

  if (!user || user.role !== 'aluno') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Acesso restrito a alunos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Loja de Recompensas
          </h1>
          <p className="text-muted-foreground">
            Troque seus Koins por prêmios incríveis!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {balance && (
            <KoinBalance
              availableBalance={balance.availableBalance}
              blockedBalance={balance.blockedBalance}
              totalEarned={balance.totalEarned}
              isCompact
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Loja
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Meu Histórico
          </TabsTrigger>
        </TabsList>

        {/* Store Tab */}
        <TabsContent value="store" className="space-y-6">
          {/* Filters */}
          <RewardsFilters
            searchTerm={searchTerm}
            sortBy={sortBy}
            onSearchChange={setSearchTerm}
            onSortChange={setSortBy}
            onClearFilters={handleClearFilters}
          />

          {/* Items Grid */}
          <div>
            {items.length === 0 ? (
              <div className="text-center py-12">
                <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Loja em breve!
                </h3>
                <p className="text-muted-foreground">
                  Novos itens serão adicionados em breve.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item) => (
                  <RewardCard
                    key={item.id}
                    item={item}
                    onViewDetails={setSelectedItem}
                    onRedeem={setConfirmItem}
                    studentKoins={balance?.availableBalance || 0}
                    isStudent
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                Histórico de Transações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma transação encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentTransactions
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((transaction) => {
                      const getStatusInfo = () => {
                        if (transaction.type === 'REDEMPTION') {
                          if (transaction.redemptionStatus === 'PENDING') {
                            return {
                              badge: 'Aguardando Aprovação',
                              badgeClass: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
                              amountClass: 'text-orange-500',
                              prefix: '⏳',
                              description: `Resgate solicitado: ${transaction.itemName || transaction.description}`
                            };
                          } else if (transaction.redemptionStatus === 'APPROVED') {
                            return {
                              badge: 'Resgate Aprovado',
                              badgeClass: 'bg-green-500/10 text-green-600 border-green-500/30',
                              amountClass: 'text-red-500',
                              prefix: '-',
                              description: `Resgate aprovado: ${transaction.itemName || transaction.description}`
                            };
                          } else if (transaction.redemptionStatus === 'REJECTED') {
                            return {
                              badge: 'Resgate Recusado',
                              badgeClass: 'bg-red-500/10 text-red-600 border-red-500/30',
                              amountClass: 'text-blue-500',
                              prefix: '+',
                              description: `Resgate recusado (reembolsado): ${transaction.itemName || transaction.description}`
                            };
                          }
                        } else if (transaction.type === 'REFUND') {
                          return {
                            badge: 'Reembolso',
                            badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
                            amountClass: 'text-green-500',
                            prefix: '+',
                            description: transaction.description
                          };
                        } else if (transaction.type === 'BONUS') {
                          return {
                            badge: 'Bonificação',
                            badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
                            amountClass: 'text-green-500',
                            prefix: '+',
                            description: transaction.description
                          };
                        } else if (transaction.type === 'EARN') {
                          return {
                            badge: 'Ganho',
                            badgeClass: 'bg-green-500/10 text-green-600 border-green-500/30',
                            amountClass: 'text-green-500',
                            prefix: '+',
                            description: transaction.description
                          };
                        }
                        
                        return {
                          badge: transaction.type,
                          badgeClass: 'bg-muted text-muted-foreground',
                          amountClass: transaction.amount < 0 ? 'text-red-500' : 'text-green-500',
                          prefix: transaction.amount < 0 ? '-' : '+',
                          description: transaction.description
                        };
                      };

                      const statusInfo = getStatusInfo();

                      return (
                        <div
                          key={transaction.id}
                          className="flex items-start justify-between p-4 bg-muted/5 rounded-lg border border-border/50 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">{statusInfo.description}</p>
                              {statusInfo.badge && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${statusInfo.badgeClass}`}
                                >
                                  {statusInfo.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.timestamp).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Coins className="h-4 w-4 text-yellow-500" />
                            <span className={`font-bold text-base ${statusInfo.amountClass}`}>
                              {statusInfo.prefix}{Math.abs(transaction.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <RewardDetailModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onRedeem={setConfirmItem}
        studentKoins={balance?.availableBalance || 0}
        isStudent
      />

      <RedemptionConfirmModal
        item={confirmItem}
        isOpen={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={handleRedeem}
        studentKoins={balance?.availableBalance || 0}
        isProcessing={isProcessing}
      />

      <KoinHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        transactions={studentTransactions}
        studentName="Seu"
      />
    </div>
  );
}