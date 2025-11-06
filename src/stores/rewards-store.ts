import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { RewardItem, KoinTransaction, RedemptionRequest, KoinBalance, BonusEvent } from '@/types/rewards';

// Helper function to log audit events
async function logAudit(params: {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  meta?: any;
}) {
  try {
    // Get actor details
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', params.actorId)
      .single();

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', params.actorId)
      .single();

    await supabase.from('audit_events').insert({
      actor_id: params.actorId,
      actor_name: profile?.name || 'Desconhecido',
      actor_email: profile?.email || '',
      actor_role: userRole?.role || 'unknown',
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId,
      entity_label: params.entityLabel,
      scope: 'GLOBAL',
      meta: params.meta || {}
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

interface TransactionFilters {
  search?: string;
  type?: KoinTransaction['type'] | 'all';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'all';
  studentId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface RewardsStore {
  // State
  items: RewardItem[];
  transactions: KoinTransaction[];
  redemptions: RedemptionRequest[];
  bonusEvents: BonusEvent[];
  balances: Map<string, KoinBalance>;
  searchTerm: string;
  sortBy: 'name' | 'price-asc' | 'price-desc';
  
  // Filters and pagination
  filters: TransactionFilters;
  currentPage: number;
  itemsPerPage: number;
  
  // Loading states
  isLoading: boolean;
  
  // Cache (store timestamp of last fetch for each resource)
  lastFetch: Map<string, number>;
  
  // Data loading
  loadItems: () => Promise<void>;
  loadTransactions: (studentId: string, forceRefresh?: boolean) => Promise<void>;
  loadAllTransactions: (forceRefresh?: boolean) => Promise<void>;
  loadRedemptions: (forceRefresh?: boolean) => Promise<void>;
  
  // Filters and sorting
  getFilteredItems: () => RewardItem[];
  getFilteredTransactions: () => KoinTransaction[];
  setSearchTerm: (term: string) => void;
  setSortBy: (sort: 'name' | 'price-asc' | 'price-desc') => void;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  clearFilters: () => void;
  
  // Pagination
  setPage: (page: number) => void;
  getTotalPages: () => number;
  getPaginatedTransactions: () => KoinTransaction[];
  
  // Balance management
  getStudentBalance: (studentId: string) => KoinBalance;
  loadStudentBalance: (studentId: string, forceRefresh?: boolean) => Promise<void>;
  
  // Redemptions
  requestRedemption: (studentId: string, studentName: string, itemId: string, itemName: string, koinAmount: number) => Promise<{ success: boolean; message: string }>;
  approveRedemption: (redemptionId: string, approvedBy: string) => Promise<{ success: boolean; message: string }>;
  rejectRedemption: (redemptionId: string, rejectedBy: string, reason: string) => Promise<{ success: boolean; message: string }>;
  
  // State management
  addTransaction: (transaction: Omit<KoinTransaction, 'id' | 'timestamp'>) => void;
  
  // Items (Admin)
  addItem: (item: Omit<RewardItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<RewardItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  // Bonus Events (Admin) - DEPRECATED
  createBonusEvent: (event: Omit<BonusEvent, 'id' | 'createdAt'>) => Promise<void>;
  
  // Realtime subscriptions
  subscribeToRedemptions: (callback: () => void) => () => void;
  subscribeToTransactions: (callback: () => void) => () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useRewardsStore = create<RewardsStore>((set, get) => ({
  items: [],
  transactions: [],
  redemptions: [],
  bonusEvents: [],
  balances: new Map(),
  searchTerm: '',
  sortBy: 'name',
  filters: {},
  currentPage: 1,
  itemsPerPage: 20,
  isLoading: false,
  lastFetch: new Map(),

  loadItems: async () => {
    try {
      // TODO FASE 7: Adicionar filtro .eq('school_id', currentSchoolId) quando RLS estiver implementado
      const { data, error } = await supabase
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
      get().lastFetch.set('items', Date.now());
    } catch (error) {
      console.error('Error loading reward items:', error);
    }
  },

  loadTransactions: async (studentId: string, forceRefresh = false) => {
    const cacheKey = `transactions-${studentId}`;
    const lastFetch = get().lastFetch.get(cacheKey) || 0;
    
    if (!forceRefresh && Date.now() - lastFetch < CACHE_DURATION) {
      return; // Use cache
    }

    try {
      set({ isLoading: true });
      
      // FASE 2: Query robusta com JOINs explícitos
      const { data, error } = await supabase
        .from('koin_transactions')
        .select(`
          *,
          redemption_requests!koin_transactions_related_entity_id_fkey(
            status,
            item_id,
            processed_at,
            processed_by,
            rejection_reason,
            reward_items(name)
          ),
          profiles!koin_transactions_processed_by_fkey(name)
        `)
        .eq('user_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // FASE 2: Mapear dados corretamente com informações da query
      const transactions: KoinTransaction[] = (data || []).map((tx: any) => ({
        id: tx.id,
        studentId: tx.user_id,
        type: tx.type,
        amount: tx.amount,
        balanceBefore: tx.balance_before,
        balanceAfter: tx.balance_after,
        source: tx.related_entity_id || '',
        description: tx.description || '',
        timestamp: tx.created_at,
        responsibleUserId: tx.processed_by,
        // Dados do resgate vindos do JOIN
        redemptionStatus: tx.redemption_requests?.status,
        itemName: tx.redemption_requests?.reward_items?.name || tx.description,
        responsibleUserName: tx.profiles?.name,
        processedAt: tx.redemption_requests?.processed_at,
        rejectionReason: tx.redemption_requests?.rejection_reason
      }));

      console.log('[RewardsStore] Transações carregadas:', transactions.length);
      set({ transactions, isLoading: false });
      get().lastFetch.set(cacheKey, Date.now());
    } catch (error) {
      console.error('Error loading transactions:', error);
      set({ isLoading: false });
    }
  },

  loadAllTransactions: async (forceRefresh = false) => {
    const cacheKey = 'all-transactions';
    const lastFetch = get().lastFetch.get(cacheKey) || 0;
    
    if (!forceRefresh && Date.now() - lastFetch < CACHE_DURATION) {
      return; // Use cache
    }

    try {
      set({ isLoading: true });
      
      // TODO FASE 7: Filtro por school_id será aplicado via RLS no banco de dados
      const { data, error } = await supabase
        .from('koin_transactions')
        .select(`
          *,
          redemption_requests!koin_transactions_related_entity_id_fkey(
            status,
            item_id,
            processed_at,
            processed_by,
            reward_items(name)
          ),
          profiles!koin_transactions_user_id_fkey(name),
          admin:profiles!koin_transactions_processed_by_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transactions: KoinTransaction[] = (data || []).map((tx: any) => ({
        id: tx.id,
        studentId: tx.user_id,
        studentName: tx.profiles?.name,
        type: tx.type,
        amount: tx.amount,
        balanceBefore: tx.balance_before,
        balanceAfter: tx.balance_after,
        source: tx.related_entity_id || '',
        description: tx.description || '',
        timestamp: tx.created_at,
        responsibleUserId: tx.processed_by,
        redemptionStatus: tx.redemption_requests?.status,
        itemName: tx.redemption_requests?.reward_items?.name,
        responsibleUserName: tx.admin?.name,
        processedAt: tx.redemption_requests?.processed_at,
      }));

      set({ transactions, isLoading: false });
      get().lastFetch.set(cacheKey, Date.now());
    } catch (error) {
      console.error('Error loading all transactions:', error);
      set({ isLoading: false });
    }
  },

  loadRedemptions: async (forceRefresh = false) => {
    const cacheKey = 'redemptions';
    const lastFetch = get().lastFetch.get(cacheKey) || 0;
    
    if (!forceRefresh && Date.now() - lastFetch < CACHE_DURATION) {
      return; // Use cache
    }

    try {
      // TODO FASE 7: Filtro por school_id será aplicado via RLS no banco de dados
      const { data, error } = await supabase
        .from('redemption_requests')
        .select(`
          *,
          reward_items!inner(name, price_koins),
          profiles!redemption_requests_student_id_fkey(name),
          admin:profiles!redemption_requests_processed_by_fkey(name)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      const redemptions: RedemptionRequest[] = (data || []).map((req: any) => ({
        id: req.id,
        studentId: req.student_id,
        studentName: req.profiles?.name,
        itemId: req.item_id,
        itemName: req.reward_items?.name || 'Item desconhecido',
        koinAmount: req.reward_items?.price_koins || 0,
        status: req.status,
        requestedAt: req.requested_at,
        processedAt: req.processed_at,
        processedBy: req.processed_by,
        processedByName: req.admin?.name,
        rejectionReason: req.rejection_reason,
      }));

      set({ redemptions });
      get().lastFetch.set(cacheKey, Date.now());
    } catch (error) {
      console.error('Error loading redemptions:', error);
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

  getFilteredTransactions: () => {
    const { transactions, filters } = get();
    let filtered = [...transactions];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.description?.toLowerCase().includes(search) ||
        tx.studentName?.toLowerCase().includes(search) ||
        tx.itemName?.toLowerCase().includes(search)
      );
    }

    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(tx => tx.redemptionStatus === filters.status);
    }

    if (filters.studentId) {
      filtered = filtered.filter(tx => tx.studentId === filters.studentId);
    }

    if (filters.startDate) {
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter(tx => new Date(tx.timestamp) <= filters.endDate!);
    }

    return filtered;
  },

  setSearchTerm: (term: string) => set({ searchTerm: term }),
  
  setSortBy: (sort: 'name' | 'price-asc' | 'price-desc') => set({ sortBy: sort }),

  setFilters: (newFilters: Partial<TransactionFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      currentPage: 1 // Reset to first page when filters change
    }));
  },

  clearFilters: () => {
    set({
      filters: {},
      currentPage: 1
    });
  },

  setPage: (page: number) => set({ currentPage: page }),

  getTotalPages: () => {
    const filtered = get().getFilteredTransactions();
    const { itemsPerPage } = get();
    return Math.ceil(filtered.length / itemsPerPage);
  },

  getPaginatedTransactions: () => {
    const filtered = get().getFilteredTransactions();
    const { currentPage, itemsPerPage } = get();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  },

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

  loadStudentBalance: async (studentId: string, forceRefresh = false) => {
    const cacheKey = `balance-${studentId}`;
    const lastFetch = get().lastFetch.get(cacheKey) || 0;
    
    if (!forceRefresh && Date.now() - lastFetch < CACHE_DURATION) {
      return; // Use cache
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('koins')
        .eq('id', studentId)
        .single();

      if (profileError) throw profileError;

      const { data: txData, error: txError } = await supabase
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

      const { data: pendingRedemptions, error: redemptionError } = await supabase
        .from('redemption_requests')
        .select('item_id')
        .eq('student_id', studentId)
        .eq('status', 'PENDING');

      if (redemptionError) throw redemptionError;

      let blockedBalance = 0;
      if (pendingRedemptions && pendingRedemptions.length > 0) {
        const itemIds = pendingRedemptions.map((r: any) => r.item_id);
        const { data: items } = await supabase
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
      
      get().lastFetch.set(cacheKey, Date.now());
    } catch (error) {
      console.error('Error loading student balance:', error);
    }
  },

  requestRedemption: async (studentId: string, studentName: string, itemId: string, itemName: string, koinAmount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('request-redemption', {
        body: {
          studentId,
          studentName,
          itemId,
          itemName,
          koinAmount
        }
      });

      if (error) throw error;

      // Reload redemptions and balance after successful request
      await get().loadRedemptions(true);
      await get().loadStudentBalance(studentId, true);
      await get().loadTransactions(studentId, true);

      return data;
    } catch (error: any) {
      console.error('Error requesting redemption:', error);
      return { 
        success: false, 
        message: error.message || 'Erro ao solicitar resgate' 
      };
    }
  },

  approveRedemption: async (redemptionId: string, approvedBy: string) => {
    try {
      // Get student_id before approval for reloading their data
      const redemption = get().redemptions.find(r => r.id === redemptionId);
      const studentId = redemption?.studentId;

      const { error } = await supabase.rpc('approve_redemption', {
        p_redemption_id: redemptionId,
        p_admin_id: approvedBy
      });
      if (error) throw error;
      
      // Reload redemptions and transactions after approval
      await get().loadRedemptions(true);
      await get().loadAllTransactions(true);
      
      // Reload student-specific data to update their balance and history
      if (studentId) {
        console.log('[RewardsStore] Recarregando dados do aluno após aprovação:', studentId);
        await get().loadStudentBalance(studentId, true);
        await get().loadTransactions(studentId, true);
      }
      
      return { success: true, message: 'Resgate aprovado com sucesso!' };
    } catch (error) {
      console.error('Error approving redemption:', error);
      return { success: false, message: 'Erro ao aprovar resgate' };
    }
  },

  rejectRedemption: async (redemptionId: string, rejectedBy: string, reason: string) => {
    try {
      // Get student_id before rejection for reloading their data
      const redemption = get().redemptions.find(r => r.id === redemptionId);
      const studentId = redemption?.studentId;

      const { error } = await supabase.rpc('reject_redemption', {
        p_redemption_id: redemptionId,
        p_admin_id: rejectedBy,
        p_reason: reason
      });
      if (error) throw error;
      
      // Reload redemptions and transactions after rejection
      await get().loadRedemptions(true);
      await get().loadAllTransactions(true);
      
      // Reload student-specific data to update their balance (refund) and history
      if (studentId) {
        console.log('[RewardsStore] Recarregando dados do aluno após rejeição:', studentId);
        await get().loadStudentBalance(studentId, true);
        await get().loadTransactions(studentId, true);
      }
      
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

  // DEPRECATED
  createBonusEvent: async (event: Omit<BonusEvent, 'id' | 'createdAt'>) => {
    console.warn('[rewards-store] createBonusEvent is deprecated. Use the grant-koin-bonus edge function instead.');
    throw new Error('This method is deprecated. Please use the grant-koin-bonus edge function.');
  },

  addItem: async (item: Omit<RewardItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
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

      // Log audit event
      if (user?.id) {
        await logAudit({
          actorId: user.id,
          action: 'CREATE',
          entity: 'reward_item',
          entityId: data.id,
          entityLabel: data.name,
          meta: {
            price_koins: data.price_koins,
            stock: data.stock,
            category: data.category
          }
        });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  },

  updateItem: async (id: string, updates: Partial<RewardItem>) => {
    try {
      // Get current user and item name for audit
      const { data: { user } } = await supabase.auth.getUser();
      const currentItem = get().items.find(item => item.id === id);
      
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

      const { error } = await supabase
        .from('reward_items')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        items: state.items.map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));

      // Log audit event
      if (user?.id && currentItem) {
        await logAudit({
          actorId: user.id,
          action: 'UPDATE',
          entity: 'reward_item',
          entityId: id,
          entityLabel: currentItem.name,
          meta: {
            fields: Object.keys(dbUpdates),
            updates: dbUpdates
          }
        });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  deleteItem: async (id: string) => {
    try {
      // Get current user and item name for audit
      const { data: { user } } = await supabase.auth.getUser();
      const currentItem = get().items.find(item => item.id === id);
      
      const { error } = await supabase
        .from('reward_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        items: state.items.filter(item => item.id !== id),
      }));

      // Log audit event
      if (user?.id && currentItem) {
        await logAudit({
          actorId: user.id,
          action: 'DELETE',
          entity: 'reward_item',
          entityId: id,
          entityLabel: currentItem.name,
          meta: {
            soft_delete: true
          }
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  subscribeToRedemptions: (callback: () => void) => {
    const channel = supabase
      .channel('redemptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'redemption_requests'
        },
        () => {
          get().loadRedemptions(true);
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToTransactions: (callback: () => void) => {
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'koin_transactions'
        },
        () => {
          get().loadAllTransactions(true);
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
