import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Heart, ArrowRight } from 'lucide-react';
import { useFamilyMetrics } from '@/hooks/useFamilyMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function FamilyMetricsWidget() {
  const { data: metrics, isLoading } = useFamilyMetrics();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="glass-card border-pink-500/30">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <Card className="glass-card border-pink-500/30 hover:border-pink-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400" />
            <span className="gradient-text">Vínculos Familiares</span>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/admin/relacoes-familiares')}
            className="text-xs text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 gap-1"
          >
            Ver Detalhes
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Famílias com múltiplos alunos */}
        <div className="group relative rounded-xl overflow-hidden backdrop-blur-md bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-2 border-pink-500/30 hover:border-pink-500/60 transition-all duration-300 p-4 hover:scale-102 cursor-pointer">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-pink-500 opacity-20 rounded-full blur-xl animate-pulse" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                Famílias Multi-Alunos
              </p>
              <p className="text-3xl font-bold text-pink-400 tracking-tight">
                {metrics.multi_student_families}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                de {metrics.total_families} famílias totais
              </p>
            </div>
            <Users className="h-10 w-10 text-pink-400/50 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* Média de alunos por família */}
        <div className="group relative rounded-xl overflow-hidden backdrop-blur-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 p-4 hover:scale-102 cursor-pointer">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500 opacity-20 rounded-full blur-xl animate-pulse" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                Média Alunos/Família
              </p>
              <p className="text-3xl font-bold text-purple-400 tracking-tight">
                {metrics.avg_students_per_family.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                alunos por responsável
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-purple-400/50 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* Top Responsável */}
        {metrics.top_guardians.length > 0 && (
          <div className="rounded-xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-rose-500/10 border border-pink-500/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-pink-400" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Responsável Mais Recorrente
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground text-sm">
                {metrics.top_guardians[0].name}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/20 border border-pink-500/30">
                  <Users className="h-3 w-3 text-pink-400" />
                  <span className="text-xs font-medium text-pink-400">
                    {metrics.top_guardians[0].student_count} alunos
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {metrics.top_guardians[0].students.slice(0, 3).map((student, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded-full bg-white/5 text-muted-foreground border border-white/10"
                  >
                    {student}
                  </span>
                ))}
                {metrics.top_guardians[0].students.length > 3 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-muted-foreground border border-white/10">
                    +{metrics.top_guardians[0].students.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
