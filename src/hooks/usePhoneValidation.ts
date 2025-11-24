import { useState } from 'react';
import { useDuplicateCheck } from './useDuplicateCheck';
import { useSchool } from '@/contexts/SchoolContext';
import { validatePhone } from '@/lib/validation';
import { toast } from 'sonner';

interface PhoneValidationOptions {
  showToast?: boolean;
  onDuplicate?: (result: any) => void;
}

/**
 * Hook global para validação completa de telefones
 * Inclui validação de formato + detecção de duplicatas
 * Respeita isolamento multi-tenant
 */
export function usePhoneValidation() {
  const { currentSchool } = useSchool();
  const { checkDuplicates } = useDuplicateCheck();
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Valida telefone (formato + duplicatas)
   * @param phone - Telefone a validar
   * @param excludeUserId - ID do usuário a excluir da verificação (para edição)
   * @param options - Opções de exibição e callback
   * @returns true se válido, false se inválido ou duplicado
   */
  const validatePhoneWithDuplicateCheck = async (
    phone: string,
    excludeUserId?: string,
    options?: PhoneValidationOptions
  ): Promise<boolean> => {
    // 1. Validar formato
    const formatError = validatePhone(phone);
    if (formatError) {
      if (options?.showToast) {
        toast.error(formatError);
      }
      return false;
    }

    // 2. Verificar duplicatas
    setIsChecking(true);
    try {
      const result = await checkDuplicates({ phone }, currentSchool?.id || null, excludeUserId);
      setIsChecking(false);

      const hasDuplicate = result.hasSimilarities && 
        result.similarities.some(s => s.type === 'phone');

      if (hasDuplicate) {
        if (options?.showToast) {
          toast.warning('⚠️ Este telefone já está cadastrado no sistema');
        }
        options?.onDuplicate?.(result);
        return false;
      }

      return true;
    } catch (error) {
      setIsChecking(false);
      console.error('Erro ao validar telefone:', error);
      return false;
    }
  };

  return { validatePhoneWithDuplicateCheck, isChecking };
}
