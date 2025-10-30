import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Challenge } from '@/hooks/useChallenges';
import { Edit, Trash2, Power, PowerOff } from 'lucide-react';

interface ChallengesTableProps {
  challenges: Challenge[];
  onEdit: (challenge: Challenge) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const TYPE_LABELS = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  ACHIEVEMENT: 'Conquista',
};

const TYPE_COLORS = {
  DAILY: 'bg-blue-500/20 text-blue-500',
  WEEKLY: 'bg-purple-500/20 text-purple-500',
  ACHIEVEMENT: 'bg-yellow-500/20 text-yellow-500',
};

export function ChallengesTable({ challenges, onEdit, onDelete, onToggleActive }: ChallengesTableProps) {
  return (
    <div className="space-y-4">
      {challenges.map((challenge) => (
        <Card key={challenge.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-foreground">{challenge.title}</h3>
                <Badge className={TYPE_COLORS[challenge.type]}>
                  {TYPE_LABELS[challenge.type]}
                </Badge>
                {challenge.is_active ? (
                  <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-500/20 text-gray-500 border-gray-500/30">
                    Inativo
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Ação:</span>
                  <span className="font-medium">{challenge.action_target}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Quantidade:</span>
                  <span className="font-medium">{challenge.action_count}x</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Recompensa:</span>
                  <span className="font-medium text-purple-500">{challenge.koin_reward} Koins</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant={challenge.is_active ? "outline" : "default"}
                onClick={() => onToggleActive(challenge.id, !challenge.is_active)}
              >
                {challenge.is_active ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(challenge)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir "${challenge.title}"?`)) {
                    onDelete(challenge.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
