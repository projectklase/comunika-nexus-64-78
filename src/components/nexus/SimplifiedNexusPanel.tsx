import { ChallengeHub } from './ChallengeHub';
import { Card } from '@/components/ui/card';

export function SimplifiedNexusPanel() {
  return (
    <div className="space-y-6">
      <Card className="glass-card border-border/50 p-6">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Hub de Desafios
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Complete desafios e ganhe Koins!
        </p>
        <ChallengeHub />
      </Card>
    </div>
  );
}
