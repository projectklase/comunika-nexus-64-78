import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardsStore } from '@/stores/rewards-store';
import { RewardCard } from '@/components/rewards/RewardCard';
import { RewardDetailModal } from '@/components/rewards/RewardDetailModal';
import { RedemptionConfirmModal } from '@/components/rewards/RedemptionConfirmModal';
import { KoinHistoryModal } from '@/components/rewards/KoinHistoryModal';
import { RewardsFilters } from '@/components/rewards/RewardsFilters';
import { KoinBalance } from '@/components/rewards/KoinBalance';
import { Button } from '@/components/ui/button';
import { RewardItem } from '@/types/rewards';
import { History, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    transactions,
    requestRedemption
  } = useRewardsStore();

  const [selectedItem, setSelectedItem] = useState<RewardItem | null>(null);
  const [confirmItem, setConfirmItem] = useState<RewardItem | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const items = getFilteredItems();
  const balance = user ? getStudentBalance(user.id) : null;
  const studentTransactions = transactions.filter(t => t.studentId === user?.id);

  const handleRedeem = async (item: RewardItem) => {
    if (!user) return;
    
    setIsProcessing(true);
    
    try {
      const result = requestRedemption(user.id, item.id);
      
      if (result.success) {
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
          
          <Button
            variant="outline"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Meu Histórico
          </Button>
        </div>
      </div>

      {/* Filters */}
      <RewardsFilters
        searchTerm={searchTerm}
        sortBy={sortBy}
        onSearchChange={setSearchTerm}
        onSortChange={setSortBy}
        onClearFilters={handleClearFilters}
      />

      {/* Items Grid */}
      <div className="mt-8">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum item encontrado
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Tente ajustar os filtros de busca"
                : "A loja está sendo abastecida com novos itens!"
              }
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