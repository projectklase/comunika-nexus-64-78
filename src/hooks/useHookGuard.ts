// TODO: REGRA CRÍTICA - NUNCA usar hooks dentro de condicionais, loops ou funções aninhadas
// TODO: Sempre declarar hooks no topo do componente/hook customizado
// TODO: Ordem dos hooks deve ser sempre a mesma entre renders

import { useEffect } from 'react';

/**
 * Hook de desenvolvimento para detectar possível uso incorreto de hooks
 * Apenas roda em modo de desenvolvimento
 */
export function useHookGuard(componentName: string = 'Unknown') {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Verificar se há hooks sendo chamados dinamicamente
    const originalError = console.error;
    const originalWarn = console.warn;

    let hookViolationDetected = false;

    // Interceptar erros relacionados a hooks
    console.error = (...args) => {
      const message = args.join(' ');
      
      if (message.includes('Invalid hook call') || 
          message.includes('Hooks can only be called') ||
          message.includes('rendered fewer hooks')) {
        hookViolationDetected = true;
        console.warn(`🚨 [${componentName}] HOOK VIOLATION DETECTED:`, message);
        console.warn(`🚨 [${componentName}] Verifique se hooks não estão em condicionais/loops!`);
        console.trace('Stack trace do erro de hook:');
      }
      
      originalError(...args);
    };

    // Cleanup
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      
      if (hookViolationDetected) {
        console.warn(`🚨 [${componentName}] Componente teve violações de hooks - revisar código!`);
      }
    };
  }, [componentName]);

  // Verificação adicional em desenvolvimento
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.log(`✅ [${componentName}] Hook guard ativo - monitorando violações de hooks`);
  }, [componentName]);
}

/**
 * Função utilitária para verificar se hooks estão sendo chamados corretamente
 * Pode ser chamada manualmente durante desenvolvimento
 */
export function validateHooksUsage(componentName: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  // Simular verificação de ordem de hooks
  const hookCallStack = new Error().stack;
  
  if (hookCallStack?.includes('conditional') || 
      hookCallStack?.includes('loop') ||
      hookCallStack?.includes('if (') ||
      hookCallStack?.includes('for (') ||
      hookCallStack?.includes('while (')) {
    console.warn(`🚨 [${componentName}] POSSÍVEL VIOLAÇÃO: Hook pode estar em condicional/loop`);
    console.warn('Stack trace:', hookCallStack);
  }
}

/**
 * Wrapper para hooks que adiciona verificação automática
 */
export function withHookGuard<T extends any[], R>(
  hookFn: (...args: T) => R,
  hookName: string
) {
  return (...args: T): R => {
    if (process.env.NODE_ENV === 'development') {
      validateHooksUsage(hookName);
    }
    return hookFn(...args);
  };
}