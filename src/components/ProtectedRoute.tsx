import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const { currentSchool, isLoading: schoolLoading } = useSchool();

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

  // Bloquear acesso para admins com pagamento pendente
  if (user.role === 'administrador' && user.subscriptionStatus === 'pending_payment') {
    return <Navigate to="/pending-payment" replace />;
  }

  // Bloquear alunos se escola estiver em soft launch
  if (user.role === 'aluno' && currentSchool && currentSchool.is_student_access_active !== true) {
    return <Navigate to="/waiting-room" replace />;
  }

  // Check role permissions if allowedRoles is provided
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};