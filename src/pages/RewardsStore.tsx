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
import { notificationStore } from '@/stores/notification-store';
import { generateRedemptionManagementLink } from '@/utils/deep-links';

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
      const result = requestRedemption(user.id, item.id);
      
      if (result.success) {
        // Evento 3: Aluno solicita resgate de item
        notificationStore.add({
          type: 'REDEMPTION_REQUESTED',
          title: 'Nova solicitação de resgate',
          message: `Nova solicitação de resgate: O aluno ${user.name} deseja resgatar o item '${item.name}'.`,
          roleTarget: 'SECRETARIA',
          link: generateRedemptionManagementLink(),
          meta: {
            studentId: user.id,
            studentName: user.name,
            itemId: item.id,
            itemName: item.name,
            koinAmount: item.koinPrice,
            requestType: 'redemption'
          }
        });

        toast({
          title: "Resgate solicitado!",
          description: result.message,
          duration: 4000
        });
      } else {
        toast({
          title: "Erro no resgate",
          description: result.message,
          variant: "destructive",
          duration: 4000
        });
      }
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
                    .map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border border-border/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-500" />
                        <span className={`font-medium ${
                          transaction.type === 'SPEND' 
                            ? 'text-red-500' 
                            : 'text-green-500'
                        }`}>
                          {transaction.type === 'SPEND' ? '-' : '+'}
                          {transaction.amount}
                        </span>
                      </div>
                    </div>
                  ))}
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