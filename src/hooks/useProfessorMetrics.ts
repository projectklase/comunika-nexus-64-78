import { useMemo } from 'react';
import { deliveryStore } from '@/stores/delivery-store';
import { postStore } from '@/stores/post-store';
import { useClassStore } from '@/stores/class-store';
import { useAuth } from '@/contexts/AuthContext';

export function useProfessorMetrics() {
  const { user } = useAuth();
  const { classes } = useClassStore();

  return useMemo(() => {
    if (!user) return null;

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

    const activitiesDueSoon = postStore.list()
      .filter(p => 
        ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(p.type) &&
        p.authorName === user.name &&
        p.dueAt &&
        new Date(p.dueAt) >= now &&
        new Date(p.dueAt) <= next48h
      );

    // Overdue activities
    const overdueActivities = postStore.list()
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
      pendingByClass: classIds.map(classId => ({
        classId,
        className: professorClasses.find(c => c.id === classId)?.name || 'Turma',
        count: professorDeliveries.filter(d => 
          d.classId === classId && d.reviewStatus === 'AGUARDANDO'
        ).length
      })).filter(item => item.count > 0)
    };
  }, [user, classes]);
}