import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RadarSection } from '@/components/nexus/RadarSection';
import { EnhancedPlannerSection } from '@/components/nexus/EnhancedPlannerSection';
import { TimelineSection } from '@/components/nexus/TimelineSection';
import { VoiceQuickAdd } from '@/components/nexus/VoiceQuickAdd';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useState as useQuickAddState } from 'react';
import { cn } from '@/lib/utils';

type NexusView = 'radar' | 'planner' | 'timeline';

export default function AlunoNexus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeView, setActiveView] = useState<NexusView>('radar');
  const [showQuickAdd, setShowQuickAdd] = useQuickAddState(false);
  
  // Handle URL parameters and focus events
  useEffect(() => {
    const tab = searchParams.get('tab');
    const focus = searchParams.get('focus');
    
    if (tab === 'planner') {
      setActiveView('planner');
      
      if (focus === 'today') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          focusOnToday();
        }, 100);
      }
    }
  }, [searchParams]);
  
  // Listen for focus today events from orb
  useEffect(() => {
    const handleFocusToday = () => {
      setActiveView('planner');
      setTimeout(() => {
        focusOnToday();
      }, 100);
    };
    
    window.addEventListener('nexus-focus-today', handleFocusToday);
    return () => window.removeEventListener('nexus-focus-today', handleFocusToday);
  }, []);
  
  const focusOnToday = () => {
    // Find and focus on today section
    const todaySection = document.querySelector('[data-section="today"]') as HTMLElement;
    if (todaySection) {
      todaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Flash highlight effect
      todaySection.style.animation = 'flash-highlight 600ms ease-out';
      setTimeout(() => {
        todaySection.style.animation = '';
      }, 600);
    }
  };
  
  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'q',
      action: () => setShowQuickAdd(true),
      description: 'Quick add'
    }
  ]);

  const views = [
    { id: 'radar' as const, label: 'Radar', icon: Target, description: 'O que importa agora' },
    { id: 'planner' as const, label: 'Planner', icon: Calendar, description: 'Organizar a semana' },
    { id: 'timeline' as const, label: 'Timeline', icon: TrendingUp, description: 'Próximos 30 dias' }
  ];

  const renderActiveSection = () => {
    switch (activeView) {
      case 'radar':
        return <RadarSection />;
      case 'planner':
        return <EnhancedPlannerSection />;
      case 'timeline':
        return <TimelineSection />;
      default:
        return <RadarSection />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 space-y-6">
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
                NEXUS Planner
              </h1>
              <p className="text-sm text-muted-foreground">
                Organize seus estudos de forma inteligente
              </p>
            </div>
          </div>

          <VoiceQuickAdd />
        </header>

        {/* Navigation Tabs */}
        <nav className="flex gap-2 p-2 glass-card rounded-xl border border-border/50">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={cn(
                  "flex-1 flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  "text-sm font-medium",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <div className="text-left min-w-0 flex-1">
                  <div className="font-medium">{view.label}</div>
                  <div className="text-xs opacity-70 truncate">{view.description}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Active Section */}
        <main className="min-h-[calc(100vh-200px)]">
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
}