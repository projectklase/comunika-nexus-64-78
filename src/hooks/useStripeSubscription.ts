import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StripeSubscriptionResult {
  subscribed: boolean;
  plan_slug: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  addon_schools_count: number;
}

export function useStripeSubscription() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createCheckout = async (priceType: string, quantity: number = 1) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceType, quantity },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        return true;
      }
      throw new Error('No checkout URL returned');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Erro ao criar checkout',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscription = async (): Promise<StripeSubscriptionResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw error;
      return data as StripeSubscriptionResult;
    } catch (error: any) {
      console.error('Check subscription error:', error);
      return null;
    }
  };

  const openCustomerPortal = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        return true;
      }
      throw new Error('No portal URL returned');
    } catch (error: any) {
      console.error('Customer portal error:', error);
      toast({
        title: 'Erro ao abrir portal',
        description: error.message || 'Você precisa ter uma assinatura ativa para acessar o portal',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createCheckout,
    checkSubscription,
    openCustomerPortal,
  };
}
