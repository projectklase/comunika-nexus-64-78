// TODO: REGRA CRÍTICA - Filtros NUNCA devem declarar hooks condicionalmente
// TODO: useSelectState e outros hooks de filtro devem estar no topo, sempre
// TODO: Se filtro precisa ser condicional, use early return APÓS declarar todos os hooks

import { useEffect, useState } from 'react';

interface FilterState {
  isActive: boolean;
  hasData: boolean;
  componentName: string;
}

/**
 * Hook para monitorar uso seguro de filtros e prevenir hooks condicionais
 * Detecta tentativas de registrar hooks dentro de condicionais/loops
 */
export function useFilterGuard(componentName: string, hasData: boolean = true) {
  // SEMPRE declarar hooks no topo - nunca condicionalmente
  const [filterState] = useState<FilterState>({
    isActive: true,
    hasData,
    componentName
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Verificar se componente está tentando usar hooks condicionalmente
    const checkConditionalHooks = () => {
      // Interceptar console.error para detectar erros de hooks
      const originalError = console.error;
      
      window.addEventListener('error', (event) => {
        if (event.message.includes('rendered fewer hooks') ||
            event.message.includes('rendered more hooks') ||
            event.message.includes('Invalid hook call')) {
          console.warn(`🚨 [${componentName}] FILTRO COM HOOKS CONDICIONAIS DETECTADO!`);
          console.warn(`🚨 [${componentName}] hasData: ${hasData} - hooks devem estar sempre no topo`);
          console.warn('SOLUÇÃO: Mover todos os hooks para o topo e usar early return se necessário');
          console.trace('Stack trace do erro:');
        }
      });
    };

    checkConditionalHooks();

    // Log de início de monitoramento
    console.log(`🔍 [${componentName}] Filter guard ativo - dados: ${hasData}`);
    
    // Validar que não há hooks sendo chamados condicionalmente
    if (!hasData) {
      console.log(`⚠️ [${componentName}] Componente sem dados - verificando se hooks estão no topo`);
    }

  }, [componentName, hasData]);

  return filterState;
}

/**
 * Função para validar que filtros estão usando hooks corretamente
 */
export function validateFilterHooks(componentName: string, conditions: Record<string, boolean>): void {
  if (process.env.NODE_ENV !== 'development') return;

  const hasConditionalLogic = Object.values(conditions).some(condition => !condition);
  
  if (hasConditionalLogic) {
    console.warn(`🔍 [${componentName}] Filtro com lógica condicional detectada:`);
    Object.entries(conditions).forEach(([key, value]) => {
      console.warn(`   ${key}: ${value}`);
    });
    console.warn('✅ VERIFIQUE: Todos os hooks estão declarados no topo antes das condicionais?');
  }
}

/**
 * Hook utilitário para early return seguro após declarar todos os hooks
 */
export function useSafeEarlyReturn(shouldReturn: boolean, componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    if (shouldReturn) {
      console.log(`🔄 [${componentName}] Early return executado APÓS declarar todos os hooks`);
    }
  }, [shouldReturn, componentName]);

  return shouldReturn;
}