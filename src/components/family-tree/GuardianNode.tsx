import { Handle, Position } from 'reactflow';
import { Heart, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GuardianNodeProps {
  data: {
    name: string;
    email?: string;
    phone?: string;
    studentCount?: number;
  };
}

export function GuardianNode({ data }: GuardianNodeProps) {
  return (
    <div className="relative">
      <Handle type="source" position={Position.Bottom} />
      
      <div className="px-6 py-4 rounded-xl bg-gradient-to-br from-chart-1 to-chart-1/80 border-2 border-chart-1/50 shadow-lg min-w-[200px]">
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
