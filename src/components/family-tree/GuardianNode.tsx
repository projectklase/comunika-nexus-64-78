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
    <div className="relative cursor-pointer" style={{ opacity, transform: `scale(${scale})`, transition: 'all 0.3s ease' }}>
      <Handle type="source" position={Position.Bottom} />
      
      <div className={`px-6 py-4 rounded-xl bg-gradient-to-br from-chart-1 to-chart-1/80 ${borderClass} shadow-lg min-w-[200px] hover:scale-105 transition-transform`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-background/20 flex items-center justify-center">
            <Heart className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground text-sm">Responsável</p>
            <p className="font-semibold text-foreground">{data.name}</p>
          </div>
        </div>
        
        {data.email && (
          <div className="flex items-center gap-2 text-xs text-foreground/90 mb-1">
            <Mail className="h-3 w-3" />
            {data.email}
          </div>
        )}
        
        {data.phone && (
          <div className="flex items-center gap-2 text-xs text-foreground/90 mb-2">
            <Phone className="h-3 w-3" />
            {data.phone}
          </div>
        )}
        
        <Badge className="bg-background/20 text-foreground border-background/30 text-xs">
          {data.studentCount} alunos
        </Badge>
      </div>
    </div>
  );
}
