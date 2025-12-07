import { Palette, Check } from 'lucide-react';
import { useTheme, THEME_OPTIONS } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeGalleryModal } from '@/components/gamification/ThemeGalleryModal';
import { useUnlockables } from '@/hooks/useUnlockables';

export function PreferencesTab() {
  const { currentTheme, setTheme } = useTheme();
  const [showPremiumGallery, setShowPremiumGallery] = useState(false);
  const { unequipTheme } = useUnlockables();

  const handleThemeSelect = async (themeValue: string) => {
    setTheme(themeValue as any);
    if (!themeValue.startsWith('theme_')) {
      await unequipTheme();
    }
  };

  return (
    <div className="space-y-6">
      {/* Seção Aparência */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Aparência</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Escolha o tema que melhor se adapta às suas preferências
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {THEME_OPTIONS.map(theme => (
            <button 
              key={theme.value} 
              onClick={() => handleThemeSelect(theme.value)} 
              className={cn(
                "relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-md", 
                currentTheme === theme.value 
                  ? "border-primary bg-primary/5 shadow-lg" 
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl">{theme.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    {theme.label}
                    {currentTheme === theme.value && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {theme.description}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <div 
                  className="h-6 w-full rounded border border-border/50" 
                  style={{ backgroundColor: theme.preview.bg }} 
                  title="Background" 
                />
                <div 
                  className="h-6 w-full rounded border border-border/50" 
                  style={{ backgroundColor: theme.preview.primary }} 
                  title="Primary" 
                />
                <div 
                  className="h-6 w-full rounded border border-border/50" 
                  style={{ backgroundColor: theme.preview.text }} 
                  title="Text" 
                />
              </div>
            </button>
          ))}
        </div>

        {/* Premium Themes Button */}
        <div className="pt-4 border-t border-border/50">
          <Button 
            onClick={() => setShowPremiumGallery(true)} 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/30"
          >
            <Palette className="h-5 w-5" />
            <span className="font-medium">Temas Premium</span>
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Complete desafios e ganhe XP para desbloquear temas exclusivos!
          </p>
        </div>

        {/* WCAG Notice - compacto */}
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-green-500" />
          Todos os temas seguem padrões WCAG AA/AAA de acessibilidade.
        </p>
      </div>

      <ThemeGalleryModal open={showPremiumGallery} onOpenChange={setShowPremiumGallery} />
    </div>
  );
}
