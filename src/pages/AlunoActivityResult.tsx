import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { deliveryStore } from '@/stores/delivery-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function AlunoActivityResult() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const postsData = usePosts();

  if (!user || !postId) {
    return <Navigate to="/aluno/dashboard" replace />;
  }

  const post = postsData.find(p => p.id === postId);
  const delivery = deliveryStore.getByStudentAndPost(user.id, postId);

  if (!post || !delivery) {
    return <Navigate to="/aluno/dashboard" replace />;
  }

  const getStatusIcon = () => {
    switch (delivery.reviewStatus) {
      case 'APROVADA':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'DEVOLVIDA':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (delivery.reviewStatus) {
      case 'APROVADA':
        return 'bg-green-500/10 border-green-500/20 text-green-700';
      case 'DEVOLVIDA':
        return 'bg-red-500/10 border-red-500/20 text-red-700';
      default:
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700';
    }
  };

  const getStatusText = () => {
    switch (delivery.reviewStatus) {
      case 'APROVADA':
        return 'Atividade Aprovada';
      case 'DEVOLVIDA':
        return 'Atividade Devolvida';
      default:
        return 'Aguardando Correção';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/aluno/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Cabeçalho da Atividade */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{post.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {post.type === 'ATIVIDADE' ? 'Atividade' : 
                     post.type === 'TRABALHO' ? 'Trabalho' : 
                     post.type === 'PROVA' ? 'Prova' : post.type}
                  </Badge>
                  {post.dueAt && (
                    <span className="text-sm text-muted-foreground">
                      Prazo: {format(new Date(post.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{post.body}</p>
          </CardContent>
        </Card>

        {/* Status da Entrega */}
        <Card className={getStatusColor()}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              {getStatusIcon()}
              <h3 className="text-lg font-semibold">{getStatusText()}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Data de Entrega:</span>
                <p>{format(new Date(delivery.submittedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              
              {delivery.reviewedAt && (
                <div>
                  <span className="font-medium">Data da Correção:</span>
                  <p>{format(new Date(delivery.reviewedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              )}
              
              {delivery.isLate && (
                <div>
                  <Badge variant="destructive" className="w-fit">
                    Entregue em Atraso
                  </Badge>
                </div>
              )}

              {delivery.reviewStatus === 'APROVADA' && post.activityMeta?.koinReward && (
                <div>
                  <span className="font-medium">Koins Ganhos:</span>
                  <p className="text-green-600 font-bold">+{post.activityMeta.koinReward} Koins</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comentário do Professor */}
        {delivery.reviewNote && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comentário do Professor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm leading-relaxed">{delivery.reviewNote}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Arquivos Anexados */}
        {delivery.attachments && delivery.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seus Anexos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {delivery.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(attachment.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="flex gap-4">
          <Button asChild>
            <Link to="/aluno/loja-recompensas">
              Ver Meus Koins
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link to="/aluno/calendario">
              Ver Calendário
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}