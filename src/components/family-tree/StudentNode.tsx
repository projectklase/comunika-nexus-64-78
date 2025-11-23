import { Handle, Position } from 'reactflow';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface StudentNodeProps {
  data: {
    id: string;
    name: string;
    avatar?: string;
    guardianName?: string;
    isSelected?: boolean;
    isDimmed?: boolean;
  };
}

export function StudentNode({ data }: StudentNodeProps) {
  const initials = data.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const opacity = data.isDimmed ? 0.3 : 1;
  const scale = data.isSelected ? 1.05 : 1;
  const borderClass = data.isSelected 
    ? 'border-4 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]' 
    : 'border-2 border-chart-2/50';

  return (
    <div 
      className="relative cursor-pointer animate-fade-in" 
      style={{ 
        opacity, 
        transform: `scale(${scale})`, 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        filter: data.isSelected ? 'drop-shadow(0 0 16px hsl(var(--primary) / 0.5))' : 'none'
      }}
    >
      {/* Handles verticais para conexão com responsável */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        className="!w-2.5 !h-2.5 !bg-chart-2 !border-2 !border-background"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom"
        className="!w-2.5 !h-2.5 !bg-chart-2 !border-2 !border-background"
      />
      
      {/* Handles laterais bidirecionais */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-source"
        className="!w-2.5 !h-2.5 !bg-chart-2 !border-2 !border-background"
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left"
        className="!w-2.5 !h-2.5 !bg-chart-2 !border-2 !border-background"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        className="!w-2.5 !h-2.5 !bg-chart-2 !border-2 !border-background"
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-target"
        className="!w-2.5 !h-2.5 !bg-chart-2 !border-2 !border-background"
      />
      
      <div className={`
        relative overflow-hidden
        px-4 py-3 rounded-xl 
        bg-gradient-to-br from-chart-2 via-chart-2/90 to-chart-2/70
        ${borderClass}
        shadow-[0_6px_24px_-4px_rgba(0,0,0,0.12)]
        hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.18)]
        min-w-[180px] 
        hover:scale-[1.03] 
        transition-all duration-300
        before:absolute before:inset-0 before:bg-gradient-to-t before:from-background/5 before:to-transparent before:pointer-events-none
      `}>
        {/* Glow effect quando selecionado */}
        {data.isSelected && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-transparent animate-pulse pointer-events-none" />
        )}
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-background/40 shadow-lg ring-2 ring-background/20">
              <AvatarImage src={data.avatar} alt={data.name} />
              <AvatarFallback className="bg-gradient-to-br from-background/30 to-background/10 text-foreground text-xs font-bold backdrop-blur-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Indicador de status */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-sm" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm leading-tight truncate">{data.name}</p>
            <p className="text-xs text-foreground/70 font-medium uppercase tracking-wide">Aluno</p>
          </div>
        </div>
      </div>
    </div>
  );
}
