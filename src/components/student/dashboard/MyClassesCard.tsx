import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { Post } from '@/types/post';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

interface MyClassesCardProps {
  posts: Post[];
}

export function MyClassesCard({ posts }: MyClassesCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { classes: studentClasses } = useStudentClasses();

  const classesData = useMemo(() => {
    if (!user) return [];
    
    return studentClasses.slice(0, 3).map(classItem => {
      // Count pending activities for this class
      const pendingActivities = posts.filter(post => {
        if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
        
        const postClasses = post.classIds || (post.classId ? [post.classId] : []);
        return postClasses.includes(classItem.id);
      }).length;

      return {
        id: classItem.id,
        name: classItem.name,
        pendingCount: pendingActivities,
        color: getClassColor(classItem.name)
      };
    });
  }, [user, posts, studentClasses]);

  const totalClasses = studentClasses.length;

  const handleClassClick = (classId: string) => {
    navigate(`${ROUTES.ALUNO.FEED}?classId=${classId}`);
  };

  if (classesData.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Minhas Turmas
          </CardTitle>
          <CardDescription>
            Acesso rápido às suas turmas
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Você não está matriculado em nenhuma turma
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Minhas Turmas
        </CardTitle>
        <CardDescription>
          {totalClasses} {totalClasses === 1 ? 'turma ativa' : 'turmas ativas'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {classesData.map((classItem) => (
          <div
            key={classItem.id}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-all duration-200",
              "hover:bg-muted/30 hover:border-primary/30 hover:shadow-md",
              "glass-subtle"
            )}
            onClick={() => handleClassClick(classItem.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg border",
                  classItem.color
                )}>
                  <BookOpen className="h-5 w-5" />
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-foreground">
                    {classItem.name}
                  </h4>
                  {classItem.pendingCount > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {classItem.pendingCount} {classItem.pendingCount === 1 ? 'atividade pendente' : 'atividades pendentes'}
                    </p>
                  ) : (
                    <p className="text-xs text-success">
                      Tudo em dia ✓
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {classItem.pendingCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {classItem.pendingCount}
                  </Badge>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
        
        {totalClasses > 3 && (
          <div className="pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate(ROUTES.ALUNO.FEED)}
            >
              Ver todas as turmas ({totalClasses})
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to assign colors to classes
function getClassColor(className: string): string {
  const colors = [
    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'bg-green-500/10 text-green-500 border-green-500/20',
    'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'bg-pink-500/10 text-pink-500 border-pink-500/20',
    'bg-teal-500/10 text-teal-500 border-teal-500/20',
  ];
  
  // Simple hash function to consistently assign colors
  const hash = className.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}