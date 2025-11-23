import { Handle, Position } from 'reactflow';
import { Heart, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GuardianNodeProps {
  data: {
    name: string;
    email?: string;
    phone?: string;
    studentCount?: number;
    isSelected?: boolean;
    isDimmed?: boolean;
  };
}

export function GuardianNode({ data }: GuardianNodeProps) {
  const opacity = data.isDimmed ? 0.3 : 1;
  const scale = data.isSelected ? 1.05 : 1;
  const borderClass = data.isSelected 
    ? 'border-4 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]' 
    : 'border-2 border-chart-1/50';

  return (
    <div 
      className="relative cursor-pointer animate-fade-in" 
      style={{ 
        opacity, 
        transform: `scale(${scale})`, 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        filter: data.isSelected ? 'drop-shadow(0 0 20px hsl(var(--primary) / 0.6))' : 'none'
      }}
    >
      <Handle 
        type="source" 
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-chart-1 !border-2 !border-background"
      />
      
      <div className={`
        relative overflow-hidden
        px-6 py-4 rounded-xl 
        bg-gradient-to-br from-chart-1 via-chart-1/90 to-chart-1/70
        ${borderClass}
        shadow-[0_8px_32px_-4px_rgba(0,0,0,0.15)]
        hover:shadow-[0_12px_48px_-4px_rgba(0,0,0,0.2)]
        min-w-[220px] 
        hover:scale-[1.03] 
        transition-all duration-300
        before:absolute before:inset-0 before:bg-gradient-to-t before:from-background/5 before:to-transparent before:pointer-events-none
      `}>
        {/* Glow effect quando selecionado */}
        {data.isSelected && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent animate-pulse pointer-events-none" />
        )}
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-background/30 to-background/10 flex items-center justify-center backdrop-blur-sm border border-background/20 shadow-inner">
              <Heart className="h-6 w-6 text-foreground drop-shadow-md" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent to-background/20" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground text-xs uppercase tracking-wider opacity-90 mb-0.5">Responsável</p>
              <p className="font-bold text-foreground text-base leading-tight">{data.name}</p>
            </div>
          </div>
          
          {(data.email || data.phone) && (
            <div className="space-y-1.5 mb-3 pb-3 border-b border-background/20">
              {data.email && (
                <div className="flex items-center gap-2 text-xs text-foreground/80 backdrop-blur-sm">
                  <Mail className="h-3.5 w-3.5 opacity-80" />
                  <span className="truncate">{data.email}</span>
                </div>
              )}
              
              {data.phone && (
                <div className="flex items-center gap-2 text-xs text-foreground/80 backdrop-blur-sm">
                  <Phone className="h-3.5 w-3.5 opacity-80" />
                  <span>{data.phone}</span>
                </div>
              )}
            </div>
          )}
          
          <Badge className="bg-background/25 text-foreground font-semibold border-background/30 text-xs shadow-sm backdrop-blur-sm">
            {data.studentCount} {data.studentCount === 1 ? 'aluno' : 'alunos'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
