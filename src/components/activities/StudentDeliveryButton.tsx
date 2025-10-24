import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Upload, FileX, RotateCcw, Eye, Coins } from 'lucide-react';
import { Post } from '@/types/post';
import { Delivery, DeliveryAttachment } from '@/types/delivery';
import { deliveryStore } from '@/stores/delivery-store';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ReviewStatusBadge } from './DeliveryStatusBadge';
import { KoinEarnedToast } from '@/components/student/KoinEarnedToast';
import { notificationStore } from '@/stores/notification-store';
import { generateRewardsHistoryLink } from '@/utils/deep-links';

interface StudentDeliveryButtonProps {
  activity: Post;
  classId: string;
  delivery?: Delivery | null;
  onUpdate?: () => void;
}

export function StudentDeliveryButton({ activity, classId, delivery, onUpdate }: StudentDeliveryButtonProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<DeliveryAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showKoinToast, setShowKoinToast] = useState(false);

  if (!user) return null;

  // Se a atividade não requer entrega, não mostrar botão
  // Por padrão, se requiresDelivery não está definido, consideramos true (compatibilidade com atividades antigas)
  const requiresDelivery = activity.activityMeta?.requiresDelivery !== false;
  if (!requiresDelivery) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: DeliveryAttachment[] = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      // Em produção, aqui você faria upload do arquivo e obteria a URL
      url: URL.createObjectURL(file)
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const isFirstTimeSubmission = !delivery || delivery.reviewStatus === 'DEVOLVIDA';
      
      if (delivery && delivery.reviewStatus === 'DEVOLVIDA') {
        // Reenvio
        deliveryStore.resubmit(delivery.id, {
          attachments: attachments.length > 0 ? attachments : undefined,
          notes: notes.trim() || undefined
        }, activity.dueAt);
      } else {
        // Nova entrega
        deliveryStore.submit({
          postId: activity.id,
          studentId: user.id,
          studentName: user.name,
          classId,
          attachments: attachments.length > 0 ? attachments : undefined,
          notes: notes.trim() || undefined
        }, activity.dueAt);
      }

      toast({
        title: 'Entrega realizada',
        description: delivery ? 'Atividade reenviada com sucesso!' : 'Atividade marcada como concluída!'
      });

      // Award Koins for first-time completion (not for resubmissions)
      if (!delivery && activity.activityMeta?.koinReward && activity.activityMeta.koinReward > 0) {
        setShowKoinToast(true);
        
        // Evento 1: Aluno ganha Koins por entregar tarefa
        notificationStore.add({
          type: 'KOINS_EARNED',
          title: 'Koins ganhos!',
          message: `Parabéns! Você ganhou ${activity.activityMeta.koinReward} Koins por completar a tarefa '${activity.title}'.`,
          roleTarget: 'ALUNO',
          userId: user.id,
          link: generateRewardsHistoryLink(),
          meta: {
            koinAmount: activity.activityMeta.koinReward,
            activityId: activity.id,
            activityTitle: activity.title,
            studentId: user.id
          }
        });
      }

      setIsOpen(false);
      setNotes('');
      setAttachments([]);
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao enviar a atividade.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setNotes('');
    setAttachments([]);
  };

  // Se já existe entrega
  if (delivery) {
    return (
      <>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ReviewStatusBadge 
              reviewStatus={delivery.reviewStatus} 
              isLate={delivery.isLate}
            />
            {delivery.reviewStatus === 'DEVOLVIDA' ? (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reenviar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Reenviar Atividade</DialogTitle>
                    <DialogDescription>
                      Reenvie sua atividade "{activity.title}" após fazer as correções solicitadas.
                    </DialogDescription>
                  </DialogHeader>

                  {delivery.reviewNote && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <h4 className="font-medium text-destructive mb-1">Feedback do Professor:</h4>
                      <p className="text-sm text-destructive">{delivery.reviewNote}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notes">Observações (opcional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Adicione observações sobre suas correções..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="file">Anexar arquivos (opcional)</Label>
                      <Input
                        id="file"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="mt-2"
                      />
                    </div>

                    {attachments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Arquivos selecionados:</h4>
                        <div className="space-y-2">
                          {attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{attachment.name}</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => removeAttachment(index)}
                              >
                                <FileX className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                      {isLoading ? 'Enviando...' : 'Reenviar Atividade'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Button size="sm" variant="ghost" disabled>
                <Eye className="h-4 w-4 mr-1" />
                Ver Entrega
              </Button>
            )}
          </div>

          {delivery.reviewNote && delivery.reviewStatus !== 'DEVOLVIDA' && (
            <div className="p-2 bg-muted/50 rounded text-sm text-muted-foreground">
              <strong>Feedback:</strong> {delivery.reviewNote}
            </div>
          )}
        </div>

        {/* Koin toast for resubmissions if applicable */}
        {showKoinToast && activity.activityMeta?.koinReward && (
          <KoinEarnedToast
            studentId={user.id}
            activityId={activity.id}
            activityTitle={activity.title}
            koinAmount={activity.activityMeta.koinReward}
            onComplete={() => setShowKoinToast(false)}
          />
        )}
      </>
    );
  }

  // Se não existe entrega, mostrar botão para marcar como concluída
  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <CheckCircle className="h-4 w-4 mr-1" />
            Marcar Concluída
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Marcar Atividade como Concluída</DialogTitle>
            <DialogDescription>
              Marque a atividade "{activity.title}" como concluída e envie para aprovação do professor.
              {activity.activityMeta?.koinReward && activity.activityMeta.koinReward > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <Coins className="h-4 w-4" />
                    <span className="font-medium">
                      Você receberá {activity.activityMeta.koinReward} Koins ao concluir esta atividade!
                    </span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre sua entrega..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="file">Anexar arquivos (opcional)</Label>
              <Input
                id="file"
                type="file"
                multiple
                onChange={handleFileChange}
                className="mt-2"
              />
            </div>

            {attachments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Arquivos selecionados:</h4>
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{attachment.name}</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeAttachment(index)}
                      >
                        <FileX className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Marcar como Concluída'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Koin reward toast for new submissions */}
      {showKoinToast && activity.activityMeta?.koinReward && (
        <KoinEarnedToast
          studentId={user.id}
          activityId={activity.id}
          activityTitle={activity.title}
          koinAmount={activity.activityMeta.koinReward}
          onComplete={() => setShowKoinToast(false)}
        />
      )}
    </>
  );
}