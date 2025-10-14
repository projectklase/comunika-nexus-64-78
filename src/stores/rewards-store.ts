import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { RewardItem, KoinTransaction, RedemptionRequest, KoinBalance, BonusEvent } from '@/types/rewards';

interface RewardsStore {
  items: RewardItem[];
  transactions: KoinTransaction[];
  redemptions: RedemptionRequest[];
  bonusEvents: BonusEvent[];
  balances: Map<string, KoinBalance>;
  searchTerm: string;
  sortBy: 'name' | 'price-asc' | 'price-desc';
  
  loadItems: () => Promise<void>;
  loadTransactions: (studentId: string) => Promise<void>;
  getFilteredItems: () => RewardItem[];
  setSearchTerm: (term: string) => void;
  setSortBy: (sort: 'name' | 'price-asc' | 'price-desc') => void;
  getStudentBalance: (studentId: string) => KoinBalance;
  loadStudentBalance: (studentId: string) => Promise<void>;
  requestRedemption: (studentId: string, itemId: string) => { success: boolean; message: string };
  approveRedemption: (redemptionId: string, approvedBy: string) => Promise<{ success: boolean; message: string }>;
  rejectRedemption: (redemptionId: string, rejectedBy: string, reason: string) => Promise<{ success: boolean; message: string }>;
  addTransaction: (transaction: Omit<KoinTransaction, 'id' | 'timestamp'>) => void;
  createBonusEvent: (event: Omit<BonusEvent, 'id' | 'createdAt'>) => Promise<void>;
  addItem: (item: Omit<RewardItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<RewardItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useRewardsStore = create<RewardsStore>((set, get) => ({
  items: [],
  transactions: [],
  redemptions: [],
  bonusEvents: [],
  balances: new Map(),
  searchTerm: '',
  sortBy: 'name',

  loadItems: async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('reward_items')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      const items: RewardItem[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        images: item.image_url ? [item.image_url] : [],
        koinPrice: item.price_koins,
        stock: item.stock,
        category: item.category,
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      set({ items });
    } catch (error) {
      console.error('Error loading reward items:', error);
    }
  },

  loadTransactions: async (studentId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('koin_transactions')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transactions: KoinTransaction[] = (data || []).map((tx: any) => ({
        id: tx.id,
        studentId: tx.user_id,
        type: tx.type,
        amount: tx.amount,
        balanceBefore: 0,
        balanceAfter: 0,
        source: tx.related_entity_id || '',
        description: tx.description || '',
        timestamp: tx.created_at,
        responsibleUserId: tx.processed_by,
      }));

      set({ transactions });
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  },

  getFilteredItems: () => {
    const { items, searchTerm, sortBy } = get();
    let filtered = [...items];

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.koinPrice - b.koinPrice);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.koinPrice - a.koinPrice);
        break;
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  },

  setSearchTerm: (term: string) => set({ searchTerm: term }),
  
  setSortBy: (sort: 'name' | 'price-asc' | 'price-desc') => set({ sortBy: sort }),

  getStudentBalance: (studentId: string): KoinBalance => {
    const { balances } = get();
    return balances.get(studentId) || {
      studentId,
      availableBalance: 0,
      blockedBalance: 0,
      totalEarned: 0,
      totalSpent: 0,
      lastUpdated: new Date().toISOString(),
    };
  },

  loadStudentBalance: async (studentId: string) => {
    try {
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('koins')
        .eq('id', studentId)
        .single();

      if (profileError) throw profileError;

      const { data: txData, error: txError } = await (supabase as any)
        .from('koin_transactions')
        .select('*')
        .eq('user_id', studentId);

      if (txError) throw txError;

      const transactions = txData || [];
      const totalEarned = transactions
        .filter((tx: any) => tx.amount > 0)
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);

      const totalSpent = Math.abs(
        transactions
          .filter((tx: any) => tx.amount < 0)
          .reduce((sum: number, tx: any) => sum + tx.amount, 0)
      );

      const { data: pendingRedemptions, error: redemptionError } = await (supabase as any)
        .from('redemption_requests')
        .select('item_id')
        .eq('student_id', studentId)
        .eq('status', 'PENDING');

      if (redemptionError) throw redemptionError;

      let blockedBalance = 0;
      if (pendingRedemptions && pendingRedemptions.length > 0) {
        const itemIds = pendingRedemptions.map((r: any) => r.item_id);
        const { data: items } = await (supabase as any)
          .from('reward_items')
          .select('price_koins')
          .in('id', itemIds);

        if (items) {
          blockedBalance = items.reduce((sum: number, item: any) => sum + item.price_koins, 0);
        }
      }

      const balance: KoinBalance = {
        studentId,
        availableBalance: (profile?.koins || 0) - blockedBalance,
        blockedBalance,
        totalEarned,
        totalSpent,
        lastUpdated: new Date().toISOString(),
      };

      set(state => {
        const newBalances = new Map(state.balances);
        newBalances.set(studentId, balance);
        return { balances: newBalances };
      });
    } catch (error) {
      console.error('Error loading student balance:', error);
    }
  },

  requestRedemption: (studentId: string, itemId: string) => {
    const { items } = get();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      return { success: false, message: 'Item não encontrado' };
    }

    if (item.stock <= 0) {
      return { success: false, message: 'Item esgotado' };
    }

    return { 
      success: true, 
      message: 'Resgate solicitado! Aguarde aprovação da secretaria.' 
    };
  },

  approveRedemption: async (redemptionId: string, approvedBy: string) => {
    try {
      const { error } = await (supabase as any).rpc('approve_redemption', {
        p_redemption_id: redemptionId,
        p_admin_id: approvedBy
      });
      if (error) throw error;
      return { success: true, message: 'Resgate aprovado com sucesso!' };
    } catch (error) {
      console.error('Error approving redemption:', error);
      return { success: false, message: 'Erro ao aprovar resgate' };
    }
  },

  rejectRedemption: async (redemptionId: string, rejectedBy: string, reason: string) => {
    try {
      const { error } = await (supabase as any).rpc('reject_redemption', {
        p_redemption_id: redemptionId,
        p_admin_id: rejectedBy,
        p_reason: reason
      });
      if (error) throw error;
      return { success: true, message: 'Resgate rejeitado com sucesso!' };
    } catch (error) {
      console.error('Error rejecting redemption:', error);
      return { success: false, message: 'Erro ao rejeitar resgate' };
    }
  },

  addTransaction: (transaction: Omit<KoinTransaction, 'id' | 'timestamp'>) => {
    set(state => ({
      transactions: [
        {
          ...transaction,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
        ...state.transactions,
      ],
    }));
  },

  // DEPRECATED: Este método não é mais usado - a bonificação agora é feita via Edge Function
  // que chama a RPC function grant_koin_bonus com SECURITY DEFINER
  createBonusEvent: async (event: Omit<BonusEvent, 'id' | 'createdAt'>) => {
    console.warn('[rewards-store] createBonusEvent is deprecated. Use the grant-koin-bonus edge function instead.');
    throw new Error('This method is deprecated. Please use the grant-koin-bonus edge function.');
  },

  addItem: async (item: Omit<RewardItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('reward_items')
        .insert({
          name: item.name,
          description: item.description,
          price_koins: item.koinPrice,
          stock: item.stock,
          category: item.category,
          image_url: item.images[0] || null,
          is_active: item.isActive,
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: RewardItem = {
        id: data.id,
        name: data.name,
        description: data.description,
        images: data.image_url ? [data.image_url] : [],
        koinPrice: data.price_koins,
        stock: data.stock,
        category: data.category,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      set(state => ({
        items: [...state.items, newItem],
      }));
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  },

  updateItem: async (id: string, updates: Partial<RewardItem>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.koinPrice !== undefined) dbUpdates.price_koins = updates.koinPrice;
      if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.images !== undefined && updates.images.length > 0) {
        dbUpdates.image_url = updates.images[0];
      }

      const { error } = await (supabase as any)
        .from('reward_items')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        items: state.items.map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  deleteItem: async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('reward_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        items: state.items.filter(item => item.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },
}));
