import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Check } from 'lucide-react';
import { useTheme, THEME_OPTIONS } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeGalleryModal } from '@/components/gamification/ThemeGalleryModal';
import { useUnlockables } from '@/hooks/useUnlockables';
export function PreferencesTab() {
  const {
    currentTheme,
    setTheme
  } = useTheme();
  const [showPremiumGallery, setShowPremiumGallery] = useState(false);
  const { unequipTheme } = useUnlockables();

  const handleThemeSelect = async (themeValue: string) => {
    // Aplicar tema
    setTheme(themeValue as any);
    
    // Se for um tema grátis (não começa com "theme_"), desequipar qualquer tema premium
    if (!themeValue.startsWith('theme_')) {
      await unequipTheme();
    }
  };
  return <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Escolha o tema que melhor se adapta às suas preferências
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {THEME_OPTIONS.map(theme => <button key={theme.value} onClick={() => handleThemeSelect(theme.value)} className={cn("relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-md", currentTheme === theme.value ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/50")}>
                  {/* Visual Preview */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl">{theme.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {theme.label}
                        {currentTheme === theme.value && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            Ativo
                          </span>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {theme.description}
                      </div>
                    </div>
                  </div>

                  {/* Color Preview Swatches */}
                  <div className="flex gap-2 mt-3">
                    <div className="h-6 w-full rounded border border-border/50" style={{
                  backgroundColor: theme.preview.bg
                }} title="Background" />
                    <div className="h-6 w-full rounded border border-border/50" style={{
                  backgroundColor: theme.preview.primary
                }} title="Primary" />
                    <div className="h-6 w-full rounded border border-border/50" style={{
                  backgroundColor: theme.preview.text
                }} title="Text" />
                  </div>
                </button>)}
            </div>

            {/* Premium Themes Button */}
            <div className="pt-4 border-t border-border/50">
              <Button 
                onClick={() => setShowPremiumGallery(true)} 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/30"
              >
                <Palette className="h-5 w-5" />
                <span className="text-white font-medium">Temas Premium</span>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Complete desafios e ganhe XP para desbloquear temas exclusivos!
              </p>
            </div>

            {/* WCAG Compliance Notice */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-lg">ℹ️</span>
              <p className="text-sm text-muted-foreground">
                Todos os temas seguem padrões <strong>WCAG AA/AAA</strong> de contraste para garantir acessibilidade e conforto visual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ThemeGalleryModal open={showPremiumGallery} onOpenChange={setShowPremiumGallery} />
    </div>;
}