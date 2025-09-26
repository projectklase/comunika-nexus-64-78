import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { deliveryService } from '@/services/delivery-service';
import { usePosts } from '@/hooks/usePosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Delivery } from '@/types/delivery';

const statusConfig = {
  AGUARDANDO: { 
    label: 'Aguardando Correção', 
    icon: Clock, 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300' 
  },
  APROVADA: { 
    label: 'Aprovada', 
    icon: CheckCircle, 
    color: 'bg-green-100 text-green-800 border-green-300' 
  },
  DEVOLVIDA: { 
    label: 'Devolvida', 
    icon: XCircle, 
    color: 'bg-red-100 text-red-800 border-red-300' 
  }
};

export default function AlunoActivityResult() {
  const { activityId } = useParams<{ activityId: string }>();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const posts = usePosts();
  const activity = posts.find(p => p.id === activityId);

  useEffect(() => {
    const loadDelivery = async () => {
      if (!user || !activityId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await deliveryService.getByStudentAndPost(user.id, activityId);
        setDelivery(result);
      } catch (err) {
        console.error('Error loading delivery:', err);
        setError('Erro ao carregar resultado da atividade');
      } finally {
        setIsLoading(false);
      }
    };

    loadDelivery();
  }, [user, activityId]);

  if (!user || !activityId) {
    return <div>Parâmetros inválidos</div>;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!delivery && !activity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Atividade não encontrada</h2>
          <p className="text-muted-foreground mb-4">A atividade solicitada não existe.</p>
          <Button asChild>
            <Link to="/aluno">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Entrega não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            Você ainda não entregou esta atividade ou ela está sendo processada.
          </p>
          <Button asChild>
            <Link to="/aluno">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[delivery.reviewStatus];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link to="/aluno">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Resultado da Atividade</h1>
            <p className="text-muted-foreground">
              {activity?.title || 'Atividade'}
            </p>
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <StatusIcon className="h-6 w-6" />
              Status da Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
              {delivery.isLate && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Entregue com atraso
                </Badge>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">
                  Data de Entrega
                </h3>
                <p className="text-sm">
                  {format(new Date(delivery.submittedAt), "dd/MM/yyyy 'às' HH:mm", { 
                    locale: ptBR 
                  })}
                </p>
              </div>

              {delivery.reviewedAt && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">
                    Data de Correção
                  </h3>
                  <p className="text-sm">
                    {format(new Date(delivery.reviewedAt), "dd/MM/yyyy 'às' HH:mm", { 
                      locale: ptBR 
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feedback do Professor */}
        {delivery.reviewNote && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5" />
                Feedback do Professor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm leading-relaxed">{delivery.reviewNote}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhes da Entrega */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              Detalhes da Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {delivery.notes && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">
                  Suas Observações
                </h3>
                <div className="bg-muted/30 p-3 rounded text-sm">
                  {delivery.notes}
                </div>
              </div>
            )}

            {delivery.attachments && delivery.attachments.length > 0 && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">
                  Arquivos Anexados ({delivery.attachments.length})
                </h3>
                <div className="space-y-2">
                  {delivery.attachments.map((attachment, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.name}
                        </p>
                        {attachment.size && (
                          <p className="text-xs text-muted-foreground">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {delivery.reviewStatus === 'DEVOLVIDA' && (
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <AlertDescription>
                  Esta atividade foi devolvida para correções. Você pode reenviar uma nova versão.
                </AlertDescription>
              </Alert>
              <div className="mt-4">
                <Button asChild>
                  <Link to={`/aluno/atividade/${activityId}/reenviar`}>
                    Reenviar Atividade
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}