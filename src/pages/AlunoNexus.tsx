import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SimplifiedNexusPanel } from '@/components/nexus/SimplifiedNexusPanel';

export default function AlunoNexus() {
  const navigate = useNavigate();

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
        </header>

        {/* Main Content */}
        <main>
          <SimplifiedNexusPanel />
        </main>
      </div>
    </div>
  );
}