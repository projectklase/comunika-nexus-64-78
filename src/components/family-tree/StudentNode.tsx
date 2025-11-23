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
    <div className="relative cursor-pointer" style={{ opacity, transform: `scale(${scale})`, transition: 'all 0.3s ease' }}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      
      <div className={`px-4 py-3 rounded-xl bg-gradient-to-br from-chart-2 to-chart-2/80 ${borderClass} shadow-md min-w-[160px] hover:scale-105 transition-transform`}>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border-2 border-background">
            <AvatarImage src={data.avatar} alt={data.name} />
            <AvatarFallback className="bg-background/20 text-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">{data.name}</p>
            <p className="text-xs text-foreground/70">Aluno</p>
          </div>
        </div>
      </div>
    </div>
  );
}
