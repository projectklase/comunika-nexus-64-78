import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { SchoolSelectionModal } from './SchoolSelectionModal';
import { supabase } from '@/integrations/supabase/client';

/**
 * Gerencia a exibição do modal de seleção de escola para professores com múltiplas escolas
 * Deve ser renderizado dentro de AuthProvider E SchoolProvider
 */
export function SchoolSelectionManager() {
  const { user } = useAuth();
  const { availableSchools } = useSchool();
  const [showSchoolSelector, setShowSchoolSelector] = useState(false);

  useEffect(() => {
    const checkMultiSchoolTeacher = async () => {
      if (!user || user.role !== 'professor') return;
      
      // Buscar memberships do professor
      const { data: memberships } = await supabase
        .from('school_memberships')
        .select('school_id, schools(id, name, slug, logo_url)')
        .eq('user_id', user.id);
      
      if (memberships && memberships.length > 1) {
        // Mostrar modal apenas na primeira vez
        const hasSeenSelector = localStorage.getItem('has_seen_school_selector');
        if (!hasSeenSelector) {
          setShowSchoolSelector(true);
        }
      }
    };

    checkMultiSchoolTeacher();
  }, [user]);

  if (!user || availableSchools.length <= 1) return null;

  return (
    <SchoolSelectionModal
      open={showSchoolSelector}
      onOpenChange={setShowSchoolSelector}
    />
  );
}
