import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY' | 'ACHIEVEMENT';
  action_target: string;
  action_count: number;
  koin_reward: number;
  icon_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useChallenges() {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges((data || []) as Challenge[]);
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast({
        title: 'Erro ao carregar desafios',
        description: 'Não foi possível carregar os desafios.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createChallenge = async (challengeData: Omit<Challenge, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .insert([challengeData])
        .select()
        .single();

      if (error) throw error;

      setChallenges(prev => [data as Challenge, ...prev]);
      toast({
        title: 'Desafio criado',
        description: 'O desafio foi criado com sucesso.',
      });
      return data;
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: 'Erro ao criar desafio',
        description: 'Não foi possível criar o desafio.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateChallenge = async (id: string, challengeData: Partial<Challenge>) => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .update(challengeData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setChallenges(prev => prev.map(c => c.id === id ? (data as Challenge) : c));
      toast({
        title: 'Desafio atualizado',
        description: 'O desafio foi atualizado com sucesso.',
      });
      return data;
    } catch (error) {
      console.error('Error updating challenge:', error);
      toast({
        title: 'Erro ao atualizar desafio',
        description: 'Não foi possível atualizar o desafio.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteChallenge = async (id: string) => {
    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setChallenges(prev => prev.filter(c => c.id !== id));
      toast({
        title: 'Desafio excluído',
        description: 'O desafio foi excluído com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast({
        title: 'Erro ao excluir desafio',
        description: 'Não foi possível excluir o desafio.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await updateChallenge(id, { is_active: isActive });
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  return {
    challenges,
    loading,
    loadChallenges,
    createChallenge,
    updateChallenge,
    deleteChallenge,
    toggleActive,
  };
}
