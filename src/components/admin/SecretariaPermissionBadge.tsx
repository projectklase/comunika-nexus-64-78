import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecretariaPermissionBadgeProps {
  secretariaId: string;
}

export function SecretariaPermissionBadge({ secretariaId }: SecretariaPermissionBadgeProps) {
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      const { data, error } = await supabase
        .from('secretaria_permissions')
        .select('id')
        .eq('secretaria_id', secretariaId)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasPermissions(true);
      }
    };

    checkPermissions();
  }, [secretariaId]);

  if (!hasPermissions) return null;

  return (
    <Badge variant="outline" className="text-purple-600 border-purple-400 bg-purple-50 dark:bg-purple-950/20">
      <Key className="h-3 w-3 mr-1" />
      Permissões+
    </Badge>
  );
}
