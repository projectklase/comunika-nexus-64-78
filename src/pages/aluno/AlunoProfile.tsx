import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { useStudentRankings } from '@/hooks/useStudentRankings';
import { useUnlockables } from '@/hooks/useUnlockables';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { useStudentGamification } from '@/stores/studentGamification';
import { Button } from '@/components/ui/button';
import { RankingList } from '@/components/gamification/RankingList';
import { ProfileStats } from '@/components/gamification/ProfileStats';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { BadgeSelectorModal } from '@/components/gamification/BadgeSelectorModal';
import { PublicProfileModal } from '@/components/gamification/PublicProfileModal';
import { PremiumAvatar } from '@/components/gamification/PremiumAvatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit2, Trophy, Flame, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlunoProfile() {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const { getWeightsEnabled } = useSchoolSettings();
  const gamification = useStudentGamification();
  const { userUnlocks, isLoading: isLoadingUnlocks, getEquippedAvatarData } = useUnlockables();
  const rankings = useStudentRankings(user?.id, 10);
  
  // Avatar gamificado equipado
  const equippedAvatar = getEquippedAvatarData();
  
  const [badgeSelectorOpen, setBadgeSelectorOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const koinsEnabled = getWeightsEnabled();

  // Badges equipados (até 5)
  const equippedBadges = userUnlocks?.filter(unlock => 
    unlock.unlockable?.type === 'BADGE' && unlock.is_equipped
  ).slice(0, 5) || [];

  const handleSaveBadges = async (selectedBadges: string[]) => {
    try {
      // Desequipar todos os badges atuais
      await supabase
        .from('user_unlocks')
        .update({ is_equipped: false })
        .eq('user_id', user!.id);

      // Equipar os selecionados
      if (selectedBadges.length > 0) {
        await supabase
          .from('user_unlocks')
          .update({ is_equipped: true })
          .in('unlockable_id', selectedBadges)
          .eq('user_id', user!.id);
      }
    } catch (error) {
      console.error('Error saving badges:', error);
      throw error;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header com Avatar e Info */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-md border border-primary/30 rounded-2xl p-8 shadow-2xl shadow-primary/10 overflow-hidden">
          {/* Efeitos de fundo */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          
          <div className="relative flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Avatar Grande Gamificado */}
            <div className="relative group">
              {equippedAvatar ? (
                <PremiumAvatar 
                  emoji={equippedAvatar.emoji}
                  rarity={equippedAvatar.rarity as any}
                  size="xl"
                  imageUrl={equippedAvatar.imageUrl}
                  className="h-32 w-32 md:h-40 md:w-40"
                />
              ) : (
                <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-primary/20 flex items-center justify-center text-4xl md:text-5xl border-4 border-primary/30">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Info do Aluno */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {user.name}
                </h1>
                <p className="text-muted-foreground mt-1">{currentSchool?.name}</p>
              </div>

              {/* Stats rápidas */}
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 bg-background/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-border/50">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="font-bold">{gamification.xp.toLocaleString()} XP</span>
                </div>
                
                <div className="flex items-center gap-2 bg-background/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-border/50">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="font-bold">{gamification.streak} dias</span>
                </div>

                {koinsEnabled && (
                  <div className="flex items-center gap-2 bg-background/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-border/50">
                    <Coins className="h-5 w-5 text-amber-500" />
                    <span className="font-bold">{(user as any).koins?.toLocaleString() || 0} Koins</span>
                  </div>
                )}
              </div>

              {/* Badges Favoritos */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-sm text-muted-foreground">Badges Favoritos</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBadgeSelectorOpen(true)}
                    className="h-6 px-2"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
                
                {isLoadingUnlocks ? (
                  <div className="flex gap-2 justify-center md:justify-start">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : equippedBadges.length > 0 ? (
                  <div className="flex gap-2 justify-center md:justify-start">
                    {equippedBadges.map((badge) => (
                      badge.unlockable && (
                        <AchievementBadge
                          key={badge.id}
                          unlockable={badge.unlockable}
                          size="lg"
                        />
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Clique no botão acima para selecionar seus badges favoritos
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas Detalhadas */}
        <ProfileStats
          totalXP={gamification.xp}
          recentXPGain={150}
          activitiesCompleted={0}
          bestStreak={(user as any).best_streak_days || 0}
        />

        {/* Rankings */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Rankings da Escola
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RankingList
              students={rankings.topXP}
              type="xp"
              currentUserId={user.id}
              isLoading={rankings.isLoading}
              onStudentClick={setSelectedStudentId}
            />
            
            {koinsEnabled && (
              <RankingList
                students={rankings.topKoins}
                type="koins"
                currentUserId={user.id}
                isLoading={rankings.isLoading}
                onStudentClick={setSelectedStudentId}
              />
            )}
            
            <RankingList
              students={rankings.topStreak}
              type="streak"
              currentUserId={user.id}
              isLoading={rankings.isLoading}
              onStudentClick={setSelectedStudentId}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <BadgeSelectorModal
        open={badgeSelectorOpen}
        onOpenChange={setBadgeSelectorOpen}
        currentBadges={equippedBadges.map(b => b.unlockable_id)}
        onSave={handleSaveBadges}
      />

      {selectedStudentId && (
        <PublicProfileModal
          open={!!selectedStudentId}
          onOpenChange={(open) => !open && setSelectedStudentId(null)}
          studentId={selectedStudentId}
        />
      )}
    </div>
  );
}
