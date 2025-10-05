import { useState, useEffect } from 'react';
import { deliveryStore } from '@/stores/delivery-store';
import { postStore } from '@/stores/post-store';
import { useClassStore } from '@/stores/class-store';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/types/post';

export function useProfessorMetrics() {
  const { user } = useAuth();
  const { classes } = useClassStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (!user || isLoading) return null;

  // Get professor's classes (filter by teacher ID since teachers is array of userIds)
  const professorClasses = classes.filter(c => 
    c.teachers?.includes(user.id)
  );
  
  const classIds = professorClasses.map(c => c.id);

  // Get deliveries for professor's classes
  const allDeliveries = deliveryStore.list({ classId: classIds.length > 0 ? classIds[0] : undefined });
  const professorDeliveries = allDeliveries.filter(d => classIds.includes(d.classId));

  // Pending deliveries (waiting for review)
  const pendingDeliveries = professorDeliveries.filter(d => d.reviewStatus === 'AGUARDANDO');

  // Activities due in next 48h
  const now = new Date();
  const next48h = new Date();
  next48h.setHours(next48h.getHours() + 48);

  const activitiesDueSoon = posts
    .filter(p => 
      ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(p.type) &&
      p.authorName === user.name &&
      p.dueAt &&
      new Date(p.dueAt) >= now &&
      new Date(p.dueAt) <= next48h
    );

  // Overdue activities
  const overdueActivities = posts
    .filter(p => 
      ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(p.type) &&
      p.authorName === user.name &&
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
      pending: professorDeliveries.filter(d => d.classId === c.id && d.reviewStatus === 'AGUARDANDO').length
    })).filter(item => item.pending > 0)
  };
}
