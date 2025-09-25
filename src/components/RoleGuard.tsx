import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
}