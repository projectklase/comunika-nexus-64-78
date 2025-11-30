import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  target: string; // CSS selector for element to highlight
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Bem-vindo ao Modo Batalha!',
    description: 'Vença 2 de 3 rounds jogando cartas estrategicamente em 3 linhas diferentes.',
    target: '.battle-arena',
    position: 'bottom',
  },
  {
    title: 'Suas Cartas',
    description: 'Clique em uma carta da sua mão para selecioná-la. Cada carta tem ATK (ataque) e DEF (defesa).',
    target: '.battle-hand',
    position: 'top',
  },
  {
    title: 'Linhas de Batalha',
    description: 'Jogue suas cartas em uma das 3 linhas. A linha com maior poder total vence o round!',
    target: '.battle-line-1',
    position: 'right',
  },
  {
    title: 'Pontos de Vida (HP)',
    description: 'Quando você perde um round, perde HP. Proteja seus pontos de vida para vencer!',
    target: '.battle-hp-player',
    position: 'bottom',
  },
  {
    title: 'Pronto para Batalhar!',
    description: 'Use estratégia para escolher onde jogar suas cartas. Boa sorte!',
    target: '.battle-arena',
    position: 'bottom',
  },
];

const TUTORIAL_STORAGE_KEY = 'battle-tutorial-completed';

export const BattleTutorial = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showHelpButton, setShowHelpButton] = useState(true);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!hasCompleted) {
      // Auto-start tutorial for new players after 1 second
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeTutorial = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setIsActive(false);
    setCurrentStep(0);
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  const restartTutorial = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const currentStepData = TUTORIAL_STEPS[currentStep];

  return (
    <>
      {/* Help Button */}
      {showHelpButton && !isActive && (
        <Button
          variant="outline"
          size="icon"
          onClick={restartTutorial}
          className="fixed top-20 right-4 z-50 rounded-full shadow-lg"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      )}

      {/* Tutorial Overlay */}
      <AnimatePresence>
        {isActive && (
          <>
            {/* Dark backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/90 backdrop-blur-sm z-40"
              onClick={skipTutorial}
            />

            {/* Tutorial Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-card border-2 border-primary rounded-lg shadow-2xl p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground">
                      {currentStepData.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Passo {currentStep + 1} de {TUTORIAL_STEPS.length}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipTutorial}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Description */}
                <p className="text-foreground leading-relaxed">
                  {currentStepData.description}
                </p>

                {/* Progress Dots */}
                <div className="flex justify-center gap-2 pt-2">
                  {TUTORIAL_STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'w-8 bg-primary'
                          : 'w-2 bg-muted'
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  {currentStep < TUTORIAL_STEPS.length - 1 ? (
                    <Button onClick={handleNext}>
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={completeTutorial} className="bg-primary">
                      Começar!
                    </Button>
                  )}
                </div>

                {/* Skip Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipTutorial}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Pular Tutorial
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
