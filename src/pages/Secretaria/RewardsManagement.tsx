import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RewardCard } from '@/components/rewards/RewardCard';
import { RewardDetailModal } from '@/components/rewards/RewardDetailModal';
import { ItemFormModal } from '@/components/rewards/ItemFormModal';
import { RedemptionManagement } from '@/components/rewards/RedemptionManagement';
import { RedemptionHistory } from '@/components/rewards/RedemptionHistory';
import { BonusEventModal } from '@/components/rewards/BonusEventModal';
import { AdminKoinHistoryModal } from '@/components/rewards/AdminKoinHistoryModal';
import { RewardsAnalytics } from '@/components/rewards/RewardsAnalytics';
import { ConfirmDialog } from '@/components/ui/app-dialog/ConfirmDialog';
import { useRewardsStore } from '@/stores/rewards-store';
import { RewardItem } from '@/types/rewards';
import { useSchool } from '@/contexts/SchoolContext';
import { 
  Gift, 
  Plus, 
  Store, 
  ShoppingCart, 
  TrendingUp, 
  Users,
  Coins,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { enhanceTransactionsForAdmin } from '@/utils/transaction-enhancer';

export default function RewardsManagement() {
  const { toast } = useToast();
  const { currentSchool } = useSchool();
  const { 
    items, 
    redemptions, 
    transactions,
    bonusEvents,
    addItem, 
    updateItem, 
    deleteItem,
    loadItems,
    loadRedemptions
  } = useRewardsStore();

  const { loadAllTransactions } = useRewardsStore();

  // Load data when school changes
  useEffect(() => {
    if (currentSchool) {
      loadItems(currentSchool.id);
      loadRedemptions(currentSchool.id);
      loadAllTransactions(currentSchool.id);
    }
  }, [currentSchool?.id, loadItems, loadRedemptions, loadAllTransactions]);

  // Enhanced transactions for admin view
  const [enhancedTransactions, setEnhancedTransactions] = useState<any[]>([]);

  useEffect(() => {
    const loadEnhancedTransactions = async () => {
      const enhanced = await enhanceTransactionsForAdmin(
        transactions,
        redemptions,
        bonusEvents,
        items
      );
      setEnhancedTransactions(enhanced);
    };
    
    if (transactions.length > 0) {
      loadEnhancedTransactions();
    }
  }, [transactions, redemptions, bonusEvents, items]);

  const [selectedItem, setSelectedItem] = useState<RewardItem | null>(null);
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [deleteItemDialog, setDeleteItemDialog] = useState<{
    isOpen: boolean;
    itemId: string | null;
    itemName: string;
  }>({
    isOpen: false,
    itemId: null,
    itemName: ''
  });

  // Check for URL params to determine active tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'redemptions') {
      setActiveTab('redemptions');
    } else if (tab === 'history') {
      setActiveTab('history');
    }
  }, []);

  // Quando muda para aba Analytics, forçar refresh dos dados
  useEffect(() => {
    if (activeTab === 'analytics' && currentSchool) {
      loadAllTransactions(currentSchool.id, true); // forceRefresh = true
    }
  }, [activeTab, currentSchool?.id, loadAllTransactions]);

  // Statistics
  const totalItems = items.length;
  const activeItems = items.filter(item => item.isActive).length;
  const pendingRedemptions = redemptions.filter(r => r.status === 'PENDING').length;
  const totalKoinsDistributed = transactions
    .filter(t => t.type === 'EARN' || t.type === 'BONUS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const handleAddItem = (itemData: Omit<RewardItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    addItem(itemData);
    setShowItemForm(false);
  };

  const handleUpdateItem = (itemData: Omit<RewardItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingItem) return;
    updateItem(editingItem.id, itemData);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Check if item has pending redemptions
    const hasPendingRedemptions = redemptions.some(
      r => r.itemId === itemId && r.status === 'PENDING'
    );

    if (hasPendingRedemptions) {
      toast({
        title: "Não é possível excluir",
        description: "Este item possui resgates pendentes.",
        variant: "destructive"
      });
      return;
    }

    setDeleteItemDialog({
      isOpen: true,
      itemId,
      itemName: item.name
    });
  };

  const executeDeleteItem = () => {
    if (!deleteItemDialog.itemId) return;
    
    deleteItem(deleteItemDialog.itemId);
    toast({
      title: "Item excluído",
      description: "O item foi removido da loja.",
      duration: 3000
    });
    setDeleteItemDialog({ isOpen: false, itemId: null, itemName: '' });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Gerenciar Recompensas
          </h1>
          <p className="text-muted-foreground">
            Administre a loja de recompensas e as transações de Koins
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setShowBonusModal(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Gift className="h-4 w-4 mr-2" />
            Criar Bonificação
          </Button>
          <Button onClick={() => setShowItemForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="glass-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold text-foreground">{totalItems}</p>
              </div>
              <Store className="h-8 w-8 text-primary opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Itens Ativos</p>
                <p className="text-2xl font-bold text-green-500">{activeItems}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resgates Pendentes</p>
                <p className="text-2xl font-bold text-yellow-500">{pendingRedemptions}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-yellow-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Koins Distribuídos</p>
                <p className="text-2xl font-bold text-purple-500">{totalKoinsDistributed}</p>
              </div>
              <Coins className="h-8 w-8 text-purple-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Itens da Loja
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Resgates
            {pendingRedemptions > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1">
                {pendingRedemptions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Items Management */}
        <TabsContent value="items" className="space-y-6">
          {items.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Loja vazia
                </h3>
                <p className="text-muted-foreground mb-4">
                  Adicione o primeiro item para começar a loja de recompensas
                </p>
                <Button onClick={() => setShowItemForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <div key={item.id} className="relative group">
                  <RewardCard
                    item={item}
                    onViewDetails={setSelectedItem}
                  />
                  
                  {/* Admin Actions Overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                      onClick={() => setSelectedItem(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                      onClick={() => setEditingItem(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-500"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Redemptions Management */}
        <TabsContent value="redemptions">
          <RedemptionManagement />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <RewardsAnalytics transactions={transactions} />
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-6">
          <RedemptionHistory redemptions={redemptions} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <RewardDetailModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      <ItemFormModal
        item={editingItem}
        isOpen={showItemForm || !!editingItem}
        onClose={() => {
          setShowItemForm(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? handleUpdateItem : handleAddItem}
      />

      <BonusEventModal
        isOpen={showBonusModal}
        onClose={() => setShowBonusModal(false)}
      />

      <AdminKoinHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        transactions={enhancedTransactions}
      />

      {/* Modal de confirmação para excluir item */}
      <ConfirmDialog
        open={deleteItemDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteItemDialog({ isOpen: false, itemId: null, itemName: '' });
          }
        }}
        title="Excluir Item"
        description={`Tem certeza que deseja excluir "${deleteItemDialog.itemName}"? O item será removido permanentemente da loja.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={executeDeleteItem}
        variant="destructive"
      />
    </div>
  );
}