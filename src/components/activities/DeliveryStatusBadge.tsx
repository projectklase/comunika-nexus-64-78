import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DeliveryStatus, ReviewStatus } from '@/types/delivery';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  reviewStatus?: ReviewStatus;
  isLate?: boolean;
  className?: string;
}

const statusConfig = {
  NAO_ENTREGUE: {
    label: 'Não entregue',
    className: 'bg-muted text-muted-foreground border-muted-foreground/20'
  },
  ENTREGUE: {
    label: 'Entregue',
    className: 'bg-secondary text-secondary-foreground'
  },
  AGUARDANDO: {
    label: 'Aguardando aprovação',
    className: 'bg-primary text-primary-foreground'
  },
  APROVADA: {
    label: 'Aprovada',
    className: 'bg-success text-success-foreground'
  },
  DEVOLVIDA: {
    label: 'Devolvida',
    className: 'bg-destructive text-destructive-foreground'
  }
};

const lateConfig = {
  label: 'Atrasada',
  className: 'bg-destructive/80 text-destructive-foreground'
};

export function DeliveryStatusBadge({ status, reviewStatus, isLate, className }: DeliveryStatusBadgeProps) {
  // Se está atrasada, mostrar badge de atrasada com prioridade
  if (isLate && status !== 'NAO_ENTREGUE') {
    return (
      <Badge 
        variant="outline" 
        className={cn(lateConfig.className, className)}
      >
        {lateConfig.label}
      </Badge>
    );
  }

  // Determinar status final baseado no reviewStatus
  let finalStatus: DeliveryStatus = status;
  if (status === 'ENTREGUE' && reviewStatus) {
    finalStatus = reviewStatus as DeliveryStatus;
  }

  const config = statusConfig[finalStatus];

  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

// Badge simplificado apenas com ReviewStatus
interface ReviewStatusBadgeProps {
  reviewStatus: ReviewStatus;
  isLate?: boolean;
  className?: string;
}

export function ReviewStatusBadge({ reviewStatus, isLate, className }: ReviewStatusBadgeProps) {
  if (isLate) {
    return (
      <Badge 
        variant="outline" 
        className={cn(lateConfig.className, className)}
      >
        {lateConfig.label}
      </Badge>
    );
  }

  const config = statusConfig[reviewStatus as DeliveryStatus];

  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}