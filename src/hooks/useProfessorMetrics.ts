import { useState, useEffect, useMemo } from 'react';
import { deliveryStore } from '@/stores/delivery-store';
import { postStore } from '@/stores/post-store';
import { useClassStore } from '@/stores/class-store';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/types/post';

export function useProfessorMetrics() {
  const { user } = useAuth();
  const { classes } = useClassStore();
  
  // All hooks at the top level
  const [posts, setPosts] = useState<Post[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load posts once
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const allPosts = await postStore.list();
        setPosts(allPosts);
      } finally {
        setIsLoading(false);
      }
    };
    loadPosts();
  }, []);

  // Memoize professor's classes to avoid recalculation
  const professorClasses = useMemo(() => {
    if (!user) return [];
    return classes.filter(c => c.teachers?.includes(user.id));
  }, [user, classes]);

  // Memoize class IDs
  const classIds = useMemo(() => {
    return professorClasses.map(c => c.id);
  }, [professorClasses]);

  // Load deliveries when classIds change
  useEffect(() => {
    if (!user || classIds.length === 0) {
      setDeliveries([]);
      return;
    }

    const loadDeliveries = async () => {
      try {
        const allDeliveries = await deliveryStore.list({ classId: classIds[0] });
        const professorDeliveries = allDeliveries.filter(d => classIds.includes(d.classId));
        setDeliveries(professorDeliveries);
      } catch (error) {
        console.error('Error loading deliveries:', error);
        setDeliveries([]);
      }
    };
    
    loadDeliveries();
  }, [user, classIds]);

  // Return early if not ready, but after all hooks
  if (!user || isLoading) {
    return {
      professorClasses: [],
      pendingDeliveries: 0,
      activitiesDueSoon: [],
      overdueActivities: [],
      pendingByClass: []
    };
  }

  // Calculate metrics
  const pendingDeliveries = deliveries.filter(d => d.reviewStatus === 'AGUARDANDO');

  const now = new Date();
  const next48h = new Date();
  next48h.setHours(next48h.getHours() + 48);

  const activitiesDueSoon = posts.filter(p => 
    ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(p.type) &&
    p.authorId === user.id &&
    p.dueAt &&
    new Date(p.dueAt) >= now &&
    new Date(p.dueAt) <= next48h
  );

  const overdueActivities = posts.filter(p => 
    ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(p.type) &&
    p.authorId === user.id &&
    p.dueAt &&
    new Date(p.dueAt) < now
  );

  return {
    professorClasses,
    pendingDeliveries: pendingDeliveries.length,
    activitiesDueSoon,
    overdueActivities,
    pendingByClass: professorClasses.map(c => ({
      class: c,
      pending: deliveries.filter(d => d.classId === c.id && d.reviewStatus === 'AGUARDANDO').length
    })).filter(item => item.pending > 0)
  };
}
