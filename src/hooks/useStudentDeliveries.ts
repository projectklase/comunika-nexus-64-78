import { useState, useEffect } from 'react';
import { Post } from '@/types/post';
import { Delivery, DeliveryStatus } from '@/types/delivery';
import { deliveryStore } from '@/stores/delivery-store';
import { useAuth } from '@/contexts/AuthContext';

export interface ActivityWithDelivery {
  post: Post;
  delivery: Delivery | null;
  deliveryStatus: DeliveryStatus;
}

export function useStudentDeliveries(activities: Post[]) {
  const { user } = useAuth();
  const [activitiesWithDelivery, setActivitiesWithDelivery] = useState<ActivityWithDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || activities.length === 0) {
      setActivitiesWithDelivery([]);
      setIsLoading(false);
      return;
    }

    const fetchDeliveries = async () => {
      setIsLoading(true);
      try {
        // Buscar todas as entregas do aluno
        const allDeliveries = await deliveryStore.list({ studentId: user.id });
        
        // Mapear cada atividade com seu status de entrega
        const activitiesData: ActivityWithDelivery[] = activities.map((post) => {
          const delivery = allDeliveries.find((d) => d.postId === post.id);
          
          // Determinar status baseado na entrega
          let deliveryStatus: DeliveryStatus = 'NAO_ENTREGUE';
          
          if (delivery) {
            deliveryStatus = delivery.reviewStatus as DeliveryStatus;
          } else {
            // Verificar se está atrasada
            const isOverdue = post.dueAt ? new Date() > new Date(post.dueAt) : false;
            deliveryStatus = 'NAO_ENTREGUE';
          }
          
          return {
            post,
            delivery,
            deliveryStatus
          };
        });
        
        setActivitiesWithDelivery(activitiesData);
      } catch (error) {
        console.error('Error fetching student deliveries:', error);
        setActivitiesWithDelivery([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliveries();
  }, [user?.id, activities]);

  // Contadores por categoria
  const counters = {
    naoEntregue: activitiesWithDelivery.filter(a => a.deliveryStatus === 'NAO_ENTREGUE').length,
    aguardando: activitiesWithDelivery.filter(a => a.deliveryStatus === 'AGUARDANDO').length,
    aprovada: activitiesWithDelivery.filter(a => a.deliveryStatus === 'APROVADA').length,
    devolvida: activitiesWithDelivery.filter(a => a.deliveryStatus === 'DEVOLVIDA').length,
    atividade: activitiesWithDelivery.filter(a => a.post.type === 'ATIVIDADE').length,
    trabalho: activitiesWithDelivery.filter(a => a.post.type === 'TRABALHO').length,
    prova: activitiesWithDelivery.filter(a => a.post.type === 'PROVA').length,
  };

  return {
    activitiesWithDelivery,
    isLoading,
    counters
  };
}
