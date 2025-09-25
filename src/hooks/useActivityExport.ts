import { useCallback } from 'react';
import { Post, ActivityType } from '@/types/post';
import { useClassStore } from '@/stores/class-store';
import { deliveryStore } from '@/stores/delivery-store';
import { toCsv, downloadCsv, formatDateTime } from '@/utils/csv';
import { useToast } from '@/hooks/use-toast';
import { resolveSubjectNames } from '@/utils/class-helpers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useActivityExport = () => {
  const { getClass } = useClassStore();
  const { toast } = useToast();

  const exportActivities = useCallback((activities: Post[], classIds: string[] = []) => {
    const rows = activities.map(activity => {
      // Get class information
      const postClasses = activity.classIds || (activity.classId ? [activity.classId] : []);
      const classNames = postClasses.map(classId => {
        const cls = getClass(classId);
        return cls ? cls.name : `Turma ${classId}`;
      }).join(', ');

      // Format dates
      const dueDate = activity.dueAt ? format(new Date(activity.dueAt), 'dd/MM/yyyy', { locale: ptBR }) : '';
      const dueTime = activity.dueAt ? format(new Date(activity.dueAt), 'HH:mm', { locale: ptBR }) : '';
      const createdDate = format(new Date(activity.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR });

      // Weight information
      const peso = activity.activityMeta?.peso || '';
      const usaPeso = activity.activityMeta?.usePeso === true;

      // Activity-specific metadata
      let metadata = '';
      if (activity.type === 'TRABALHO') {
        const formats = activity.activityMeta?.formatosEntrega || [];
        metadata = formats.join(', ');
      } else if (activity.type === 'PROVA') {
        const parts = [];
        if (activity.activityMeta?.duracao) parts.push(`${activity.activityMeta.duracao}min`);
        if (activity.activityMeta?.local) parts.push(activity.activityMeta.local);
        if (activity.activityMeta?.tipoProva) parts.push(activity.activityMeta.tipoProva);
        metadata = parts.join(', ');
      }

      return {
        id: activity.id,
        tipo: activity.type,
        titulo: activity.title,
        descricao: activity.body || '',
        turmas: classNames,
        data_prazo: dueDate,
        hora_prazo: dueTime,
        peso: peso,
        usa_peso: usaPeso,
        metadados: metadata,
        status: activity.status,
        autor: activity.authorName,
        criado_em: createdDate
      };
    });

    const headers = [
      'id', 'tipo', 'titulo', 'descricao', 'turmas', 'data_prazo', 'hora_prazo',
      'peso', 'usa_peso', 'metadados', 'status', 'autor', 'criado_em'
    ];

    const csv = toCsv(rows, headers);
    const filename = `atividades_${formatDateTime()}.csv`;
    
    downloadCsv(filename, csv);
    toast({ title: "Exportação concluída", description: `${activities.length} atividades exportadas` });
  }, [getClass, toast]);

  const exportDeliveries = useCallback((activityId: string, activity: Post) => {
    const deliveries = deliveryStore.list({ postId: activityId });
    
    if (deliveries.length === 0) {
      toast({ title: "Nenhuma entrega encontrada", variant: "destructive" });
      return;
    }

    const rows = deliveries.map(delivery => {
      const submittedDate = delivery.submittedAt ? 
        format(new Date(delivery.submittedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '';
      
      const evaluatedDate = delivery.reviewedAt ? 
        format(new Date(delivery.reviewedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '';

      return {
        atividade_id: delivery.postId,
        atividade_titulo: activity.title || '',
        aluno_id: delivery.studentId,
        aluno_nome: delivery.studentName || '',
        status: delivery.reviewStatus,
        nota: '', // Grade field not available in current schema
        peso_atividade: activity.activityMeta?.peso || '',
        usa_peso: activity.activityMeta?.usePeso === true,
        comentario: delivery.reviewNote || '',
        entregue_em: submittedDate,
        avaliado_em: evaluatedDate,
        anexos_quantidade: delivery.attachments?.length || 0
      };
    });

    const headers = [
      'atividade_id', 'atividade_titulo', 'aluno_id', 'aluno_nome', 'status', 'nota',
      'peso_atividade', 'usa_peso', 'comentario', 'entregue_em', 'avaliado_em', 'anexos_quantidade'
    ];

    const csv = toCsv(rows, headers);
    const filename = `entregas_${activityId}_${formatDateTime()}.csv`;
    
    downloadCsv(filename, csv);
    toast({ title: "Exportação concluída", description: `${deliveries.length} entregas exportadas` });
  }, [toast]);

  return {
    exportActivities,
    exportDeliveries,
  };
};