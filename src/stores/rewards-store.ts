import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RewardItem, KoinTransaction, KoinBalance, RedemptionRequest, BonusEvent } from '@/types/rewards';

interface RewardsStore {
  // Reward Items
  items: RewardItem[];
  
  // Student Koins
  balances: Record<string, KoinBalance>;
  transactions: KoinTransaction[];
  
  // Redemptions
  redemptions: RedemptionRequest[];
  
  // Bonus Events
  bonusEvents: BonusEvent[];
  
  // Loading states
  loading: boolean;
  
  // Actions - Reward Items Management (Secretaria)
  addItem: (item: Omit<RewardItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateItem: (id: string, updates: Partial<RewardItem>) => void;
  deleteItem: (id: string) => void;
  
  // Actions - Student Koins
  getStudentBalance: (studentId: string) => KoinBalance;
  addTransaction: (transaction: Omit<KoinTransaction, 'id' | 'timestamp'>) => void;
  
  // Actions - Redemptions
  requestRedemption: (studentId: string, itemId: string) => { success: boolean; message: string };
  approveRedemption: (redemptionId: string, approvedBy: string) => { success: boolean; message: string };
  rejectRedemption: (redemptionId: string, rejectedBy: string, reason: string) => void;
  
  // Actions - Bonus Events (Secretaria)
  createBonusEvent: (event: Omit<BonusEvent, 'id' | 'createdAt'>) => void;
  
  // Filters and Search
  searchTerm: string;
  sortBy: 'name' | 'price-asc' | 'price-desc';
  setSearchTerm: (term: string) => void;
  setSortBy: (sort: 'name' | 'price-asc' | 'price-desc') => void;
  getFilteredItems: () => RewardItem[];
}

const generateId = () => crypto.randomUUID();

const defaultBalance: KoinBalance = {
  studentId: '',
  availableBalance: 0,
  blockedBalance: 0,
  totalEarned: 0,
  totalSpent: 0,
  lastUpdated: new Date().toISOString()
};

// Mock initial data
const mockItems: RewardItem[] = [
  {
    id: '1',
    name: 'Fone de Ouvido Bluetooth',
    description: 'Fone de ouvido sem fio com cancelamento de ruído e bateria de longa duração.',
    images: ['/placeholder.svg'],
    koinPrice: 150,
    stock: 5,
    category: 'Eletrônicos',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Vale-Pizza',
    description: 'Vale para uma pizza grande na pizzaria parceira da escola.',
    images: ['/placeholder.svg'],
    koinPrice: 80,
    stock: 20,
    category: 'Alimentação',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Kit Material Escolar Premium',
    description: 'Kit completo com canetas, lápis, marca-textos e cadernos de qualidade.',
    images: ['/placeholder.svg'],
    koinPrice: 60,
    stock: 0,
    category: 'Material Escolar',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Camiseta da Escola',
    description: 'Camiseta oficial da escola com design exclusivo.',
    images: ['/placeholder.svg'],
    koinPrice: 40,
    stock: 15,
    category: 'Vestuário',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const useRewardsStore = create<RewardsStore>()(
  persist(
    (set, get) => ({
      items: mockItems,
      balances: {},
      transactions: [],
      redemptions: [],
      bonusEvents: [],
      loading: false,
      searchTerm: '',
      sortBy: 'name',

      addItem: (itemData) => {
        const newItem: RewardItem = {
          ...itemData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        set(state => ({
          items: [...state.items, newItem]
        }));
      },

      updateItem: (id, updates) => {
        set(state => ({
          items: state.items.map(item =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date().toISOString() }
              : item
          )
        }));
      },

      deleteItem: (id) => {
        set(state => ({
          items: state.items.filter(item => item.id !== id)
        }));
      },

      getStudentBalance: (studentId) => {
        const state = get();
        return state.balances[studentId] || { ...defaultBalance, studentId };
      },

      addTransaction: (transactionData) => {
        const transaction: KoinTransaction = {
          ...transactionData,
          id: generateId(),
          timestamp: new Date().toISOString()
        };

        set(state => {
          const currentBalance = state.balances[transaction.studentId] || { ...defaultBalance, studentId: transaction.studentId };
          
          let newAvailableBalance = currentBalance.availableBalance;
          let newBlockedBalance = currentBalance.blockedBalance;
          
          if (transaction.type === 'EARN' || transaction.type === 'BONUS' || transaction.type === 'REFUND') {
            newAvailableBalance += transaction.amount;
          } else if (transaction.type === 'SPEND') {
            // This should move from available to blocked
            newAvailableBalance -= transaction.amount;
            newBlockedBalance += transaction.amount;
          }

          const updatedBalance: KoinBalance = {
            ...currentBalance,
            availableBalance: newAvailableBalance,
            blockedBalance: newBlockedBalance,
            totalEarned: transaction.type === 'EARN' || transaction.type === 'BONUS' 
              ? currentBalance.totalEarned + transaction.amount 
              : currentBalance.totalEarned,
            totalSpent: transaction.type === 'SPEND' 
              ? currentBalance.totalSpent + transaction.amount 
              : currentBalance.totalSpent,
            lastUpdated: new Date().toISOString()
          };

          return {
            transactions: [transaction, ...state.transactions],
            balances: {
              ...state.balances,
              [transaction.studentId]: updatedBalance
            }
          };
        });
      },

      requestRedemption: (studentId, itemId) => {
        const state = get();
        const item = state.items.find(i => i.id === itemId);
        const balance = state.balances[studentId] || { ...defaultBalance, studentId };
        
        if (!item) {
          return { success: false, message: 'Item não encontrado' };
        }
        
        if (!item.isActive) {
          return { success: false, message: 'Item não está disponível' };
        }
        
        if (item.stock <= 0) {
          return { success: false, message: 'Item esgotado' };
        }
        
        if (balance.availableBalance < item.koinPrice) {
          return { success: false, message: `Você precisa de mais ${item.koinPrice - balance.availableBalance} Koins` };
        }

        const redemption: RedemptionRequest = {
          id: generateId(),
          studentId,
          itemId: item.id,
          itemName: item.name,
          koinAmount: item.koinPrice,
          status: 'PENDING',
          requestedAt: new Date().toISOString()
        };

        // Create transaction to move koins from available to blocked
        get().addTransaction({
          studentId,
          type: 'SPEND',
          amount: item.koinPrice,
          balanceBefore: balance.availableBalance,
          balanceAfter: balance.availableBalance - item.koinPrice,
          source: `REDEMPTION:${redemption.id}`,
          description: `Resgate pendente: ${item.name}`
        });

        set(state => ({
          redemptions: [redemption, ...state.redemptions]
        }));

        return { success: true, message: 'Resgate solicitado com sucesso!' };
      },

      approveRedemption: (redemptionId, approvedBy) => {
        const state = get();
        const redemption = state.redemptions.find(r => r.id === redemptionId);
        const item = state.items.find(i => i.id === redemption?.itemId);
        
        if (!redemption || !item) {
          return { success: false, message: 'Resgate ou item não encontrado' };
        }
        
        if (item.stock <= 0) {
          return { success: false, message: 'Item sem estoque disponível' };
        }

        set(state => {
          const currentBalance = state.balances[redemption.studentId];
          const updatedBalance: KoinBalance = {
            ...currentBalance,
            blockedBalance: currentBalance.blockedBalance - redemption.koinAmount,
            lastUpdated: new Date().toISOString()
          };

          return {
            redemptions: state.redemptions.map(r =>
              r.id === redemptionId
                ? { ...r, status: 'APPROVED' as const, processedAt: new Date().toISOString(), processedBy: approvedBy }
                : r
            ),
            items: state.items.map(i =>
              i.id === item.id
                ? { ...i, stock: i.stock - 1, updatedAt: new Date().toISOString() }
                : i
            ),
            balances: {
              ...state.balances,
              [redemption.studentId]: updatedBalance
            }
          };
        });

        return { success: true, message: 'Resgate aprovado com sucesso!' };
      },

      rejectRedemption: (redemptionId, rejectedBy, reason) => {
        const state = get();
        const redemption = state.redemptions.find(r => r.id === redemptionId);
        
        if (!redemption) return;

        set(state => {
          const currentBalance = state.balances[redemption.studentId];
          const updatedBalance: KoinBalance = {
            ...currentBalance,
            availableBalance: currentBalance.availableBalance + redemption.koinAmount,
            blockedBalance: currentBalance.blockedBalance - redemption.koinAmount,
            lastUpdated: new Date().toISOString()
          };

          return {
            redemptions: state.redemptions.map(r =>
              r.id === redemptionId
                ? { 
                    ...r, 
                    status: 'REJECTED' as const, 
                    processedAt: new Date().toISOString(), 
                    processedBy: rejectedBy,
                    rejectionReason: reason
                  }
                : r
            ),
            balances: {
              ...state.balances,
              [redemption.studentId]: updatedBalance
            }
          };
        });

        // Add refund transaction
        get().addTransaction({
          studentId: redemption.studentId,
          type: 'REFUND',
          amount: redemption.koinAmount,
          balanceBefore: state.balances[redemption.studentId].availableBalance,
          balanceAfter: state.balances[redemption.studentId].availableBalance + redemption.koinAmount,
          source: `REDEMPTION:${redemptionId}`,
          description: `Estorno: ${redemption.itemName} - ${reason}`,
          responsibleUserId: rejectedBy
        });
      },

      createBonusEvent: (eventData) => {
        const event: BonusEvent = {
          ...eventData,
          id: generateId(),
          createdAt: new Date().toISOString()
        };

        // Add transactions for all students
        eventData.studentIds.forEach(studentId => {
          const currentBalance = get().balances[studentId] || { ...defaultBalance, studentId };
          
          get().addTransaction({
            studentId,
            type: 'BONUS',
            amount: event.koinAmount,
            balanceBefore: currentBalance.availableBalance,
            balanceAfter: currentBalance.availableBalance + event.koinAmount,
            source: `EVENT:${event.id}`,
            description: `Bonificação: ${event.name}`,
            responsibleUserId: event.createdBy
          });
        });

        set(state => ({
          bonusEvents: [event, ...state.bonusEvents]
        }));
      },

      setSearchTerm: (term) => set({ searchTerm: term }),
      setSortBy: (sort) => set({ sortBy: sort }),

      getFilteredItems: () => {
        const { items, searchTerm, sortBy } = get();
        
        let filtered = items.filter(item => 
          item.isActive && 
          (searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        switch (sortBy) {
          case 'price-asc':
            filtered.sort((a, b) => a.koinPrice - b.koinPrice);
            break;
          case 'price-desc':
            filtered.sort((a, b) => b.koinPrice - a.koinPrice);
            break;
          case 'name':
          default:
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        }

        return filtered;
      }
    }),
    {
      name: 'rewards-store'
    }
  )
);