import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface TeacherGuardProps {
  children: React.ReactNode;
}

export const TeacherGuard: React.FC<TeacherGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card p-8 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'professor') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};