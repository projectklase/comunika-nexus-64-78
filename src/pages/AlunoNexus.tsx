import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SimplifiedNexusPanel } from '@/components/nexus/SimplifiedNexusPanel';
import { useUnlockables } from '@/hooks/useUnlockables';

export default function AlunoNexus() {
  const navigate = useNavigate();
  const { checkAchievements, isCheckingAchievements } = useUnlockables();

  // One-time cleanup of legacy Nexus data from localStorage
  useEffect(() => {
    const legacyKeys = ['nexus-storage', 'student-planner-storage'];
    let cleaned = false;
    
    legacyKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        cleaned = true;
      }
    });
    
    if (cleaned) {
      console.log('✅ Legacy Nexus data cleaned from localStorage');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                Nexus Hub
              </h1>
              <p className="text-sm text-muted-foreground">
                Complete desafios, ganhe Koins e mostre seu engajamento!
              </p>
            </div>
          </div>

          <Button
            onClick={() => checkAchievements()}
            disabled={isCheckingAchievements}
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20 border-amber-500/30"
          >
            <Trophy className="h-4 w-4 mr-2" />
            {isCheckingAchievements ? 'Verificando...' : 'Verificar Conquistas'}
          </Button>
        </header>

        {/* Main Content */}
        <main>
          <SimplifiedNexusPanel />
        </main>
      </div>
    </div>
  );
}