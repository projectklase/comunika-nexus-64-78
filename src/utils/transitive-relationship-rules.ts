/**
 * Matriz de Regras Transitivas para Relacionamentos Familiares
 * 
 * Define como relacionamentos se propagam transitivamente:
 * Se A é X de B, e B é Y de C, então A é Z de C
 */

export type RelationshipType = 'SIBLING' | 'COUSIN' | 'UNCLE_NEPHEW' | 'OTHER';

/**
 * Regras transitivas de relacionamentos familiares
 * 
 * Exemplos:
 * - SIBLING + SIBLING = SIBLING (irmão do meu irmão é meu irmão)
 * - SIBLING + COUSIN = COUSIN (irmão do meu primo é meu primo)
 * - COUSIN + SIBLING = COUSIN (primo do meu irmão é meu primo)
 * - UNCLE_NEPHEW + SIBLING = UNCLE_NEPHEW (irmão do meu tio é meu tio)
 */
const TRANSITIVE_RULES: Record<string, Record<string, RelationshipType | null>> = {
  SIBLING: {
    SIBLING: 'SIBLING',           // Irmão do meu irmão = Irmão
    COUSIN: 'COUSIN',             // Irmão do meu primo = Primo
    UNCLE_NEPHEW: 'UNCLE_NEPHEW', // Irmão do meu tio = Tio
    OTHER: null,                  // Irmão de "outro" = desconhecido
  },
  COUSIN: {
    SIBLING: 'COUSIN',            // Primo do meu irmão = Primo
    COUSIN: 'COUSIN',             // Primo do meu primo = Primo (via linhagem comum)
    UNCLE_NEPHEW: null,           // Primo do tio = sem regra clara
    OTHER: null,
  },
  UNCLE_NEPHEW: {
    SIBLING: 'UNCLE_NEPHEW',      // Tio do meu irmão = Tio
    COUSIN: null,                 // Tio do meu primo = sem regra clara
    UNCLE_NEPHEW: null,           // Tio do meu tio = sem regra clara
    OTHER: null,
  },
  OTHER: {
    SIBLING: null,
    COUSIN: null,
    UNCLE_NEPHEW: null,
    OTHER: null,
  },
};

/**
 * Determina o tipo de relacionamento transitivo entre A e C
 * baseado nos relacionamentos A→B e B→C
 * 
 * @param relationAB - Tipo de relacionamento entre A e B
 * @param relationBC - Tipo de relacionamento entre B e C
 * @returns Tipo de relacionamento inferido entre A e C, ou null se não aplicável
 */
export function getTransitiveRelationship(
  relationAB: string,
  relationBC: string
): RelationshipType | null {
  // Validação de tipos
  if (!TRANSITIVE_RULES[relationAB]) {
    console.warn(`[Transitive Rules] Tipo de relacionamento desconhecido: ${relationAB}`);
    return null;
  }
  
  const rule = TRANSITIVE_RULES[relationAB][relationBC];
  
  if (rule) {
    console.log(
      `[Transitive Rules] ${relationAB} + ${relationBC} = ${rule}`
    );
  }
  
  return rule || null;
}

/**
 * Valida se um relacionamento transitivo é válido e consistente
 * 
 * @param studentAId - ID do estudante A
 * @param studentCId - ID do estudante C
 * @param inferredType - Tipo de relacionamento inferido
 * @returns true se o relacionamento é válido
 */
export function validateTransitiveRelationship(
  studentAId: string,
  studentCId: string,
  inferredType: RelationshipType
): boolean {
  // Evitar self-relationships
  if (studentAId === studentCId) {
    console.warn('[Transitive Rules] Tentativa de criar relacionamento consigo mesmo bloqueada');
    return false;
  }
  
  // Validar tipo de relacionamento
  if (!['SIBLING', 'COUSIN', 'UNCLE_NEPHEW', 'OTHER'].includes(inferredType)) {
    console.warn(`[Transitive Rules] Tipo de relacionamento inválido: ${inferredType}`);
    return false;
  }
  
  return true;
}

/**
 * Obtém a confiança de um relacionamento transitivo
 * Relacionamentos inferidos transitivamente sempre têm confiança MEDIUM
 * 
 * @returns 'MEDIUM' - confiança padrão para relacionamentos transitivos
 */
export function getTransitiveConfidence(): 'MEDIUM' {
  return 'MEDIUM';
}
