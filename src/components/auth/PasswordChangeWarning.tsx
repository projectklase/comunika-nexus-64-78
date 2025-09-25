import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const PasswordChangeWarning = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user must change password, redirect to change password page
    if (user?.mustChangePassword) {
      navigate('/alterar-senha');
    }
  }, [user, navigate]);

  if (!user?.mustChangePassword) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Você deve alterar sua senha antes de continuar.</span>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => navigate('/alterar-senha')}
        >
          Alterar senha
        </Button>
      </AlertDescription>
    </Alert>
  );
};