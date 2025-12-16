import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { Navigate } from 'react-router-dom';

interface RoleGuardProps {
  allowedRoles: string[];
  redirectTo?: string;
  children: React.ReactNode;
}

export function RoleGuard({ 
  allowedRoles, 
  redirectTo = '/dev/role-switcher', 
  children 
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const { currentSchool, isLoading: schoolLoading } = useSchool();
  
  // Loading state (mesmo padrão do ProtectedRoute)
  if (isLoading || schoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card p-8 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Soft launch check (mesmo padrão do ProtectedRoute)
  if (user.role === 'aluno' && (!currentSchool || currentSchool.is_student_access_active !== true)) {
    return <Navigate to="/waiting-room" replace />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
}
