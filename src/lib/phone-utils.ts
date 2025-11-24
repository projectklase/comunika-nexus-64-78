/**
 * Utilitários para normalização e comparação de telefones
 * 
 * @module phone-utils
 */

/**
 * Remove toda formatação de um telefone, mantendo apenas dígitos
 * 
 * @param phone - Telefone formatado ou não (ex: "(11) 99999-9999", "11999999999")
 * @returns String com apenas dígitos (ex: "11999999999") ou string vazia se inválido
 * 
 * @example
 * normalizePhoneForComparison("(11) 99999-9999") // "11999999999"
 * normalizePhoneForComparison("11 9 9999-9999") // "11999999999"
 * normalizePhoneForComparison(null) // ""
 */
export function normalizePhoneForComparison(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Verifica se dois telefones são idênticos após normalização
 * Ignora formatação e compara apenas os dígitos
 * 
 * @param phone1 - Primeiro telefone
 * @param phone2 - Segundo telefone
 * @returns true se os telefones são iguais (após normalização), false caso contrário
 * 
 * @example
 * arePhonesSame("(11) 99999-9999", "11999999999") // true
 * arePhonesSame("(11) 99999-9999", "(11) 88888-8888") // false
 * arePhonesSame(null, "11999999999") // false
 * arePhonesSame("", "") // false
 */
export function arePhonesSame(
  phone1: string | null | undefined, 
  phone2: string | null | undefined
): boolean {
  const normalized1 = normalizePhoneForComparison(phone1);
  const normalized2 = normalizePhoneForComparison(phone2);
  
  // Telefones vazios não são considerados iguais
  if (!normalized1 || !normalized2) return false;
  
  return normalized1 === normalized2;
}
