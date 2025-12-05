import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAttendance, AttendanceAnalytics } from '@/hooks/useAttendance';
import { useSchoolFeatures } from '@/hooks/useSchoolFeatures';
import { useSchool } from '@/contexts/SchoolContext';
import { ClipboardList, Users, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export function AttendanceAnalyticsWidget() {
  const { currentSchool } = useSchool();
  const { getFeatureStatus } = useSchoolFeatures(currentSchool?.id);
  const { getAttendanceAnalytics, isLoading } = useAttendance();
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);

  const isEnabled = getFeatureStatus('attendance_enabled');

  useEffect(() => {
    if (isEnabled && currentSchool?.id) {
      getAttendanceAnalytics(30).then(setAnalytics);
    }
  }, [isEnabled, currentSchool?.id]);

  if (!isEnabled) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Lista de Chamada
          </CardTitle>
          <CardDescription>Nenhum dado de presença registrado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const attendanceRate = analytics.attendance_rate || 0;
  const isGoodAttendance = attendanceRate >= 85;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Lista de Chamada
        </CardTitle>
        <CardDescription>Últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background/50 rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" />
              Taxa de Presença
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${isGoodAttendance ? 'text-green-500' : 'text-amber-500'}`}>
                {attendanceRate.toFixed(1)}%
              </span>
              {isGoodAttendance ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>

          <div className="bg-background/50 rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Taxa de Faltas
            </div>
            <span className="text-2xl font-bold text-destructive">
              {(analytics.absence_rate || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Counts */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
            ✓ {analytics.total_present} presenças
          </Badge>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            ✕ {analytics.total_absent} faltas
          </Badge>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
            ⚠ {analytics.total_justified} justificadas
          </Badge>
        </div>

        {/* High Absence Students Alert */}
        {analytics.students_with_high_absence && analytics.students_with_high_absence.length > 0 && (
          <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Alunos com muitas faltas
            </div>
            <div className="space-y-1">
              {analytics.students_with_high_absence.slice(0, 3).map((student: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-foreground truncate max-w-[150px]">{student.name}</span>
                  <span className="text-destructive font-medium">{student.absences} faltas</span>
                </div>
              ))}
              {analytics.students_with_high_absence.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{analytics.students_with_high_absence.length - 3} alunos
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
