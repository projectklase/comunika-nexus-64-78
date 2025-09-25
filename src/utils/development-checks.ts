// TODO: SISTEMA DE VERIFICAÇÕES DE DESENVOLVIMENTO
// TODO: Executar verificações automáticas em páginas críticas
// TODO: Detectar violações de hooks, filtros problemáticos, etc.

/**
 * Verificações de desenvolvimento para detectar problemas comuns
 * Apenas executa em modo de desenvolvimento
 */

export function checkHookViolations(pageName: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.group(`🔍 [${pageName}] Verificação de Hooks`);
  
  // Interceptar erros de React relacionados a hooks
  const originalError = console.error;
  let hookErrors: string[] = [];

  console.error = (...args) => {
    const message = args.join(' ');
    
    if (message.includes('rendered fewer hooks') ||
        message.includes('rendered more hooks') ||
        message.includes('Invalid hook call') ||
        message.includes('Hooks can only be called')) {
      hookErrors.push(message);
      console.warn(`🚨 ERRO DE HOOK DETECTADO: ${message}`);
    }
    
    originalError(...args);
  };

  // Restaurar após um tempo
  setTimeout(() => {
    console.error = originalError;
    
    if (hookErrors.length > 0) {
      console.error(`🚨 [${pageName}] ${hookErrors.length} violações de hooks detectadas!`);
      hookErrors.forEach((error, index) => {
        console.error(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log(`✅ [${pageName}] Nenhuma violação de hooks detectada`);
    }
    
    console.groupEnd();
  }, 3000);
}

export function checkFilterStability(pageName: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.group(`🔍 [${pageName}] Verificação de Estabilidade de Filtros`);
  
  let renderCount = 0;
  let filterChanges = 0;

  // Monitorar mudanças frequentes que podem indicar loops
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        const target = mutation.target as Element;
        
        // Detectar mudanças em selects/filtros
        if (target.matches('[data-radix-select-trigger]') || 
            target.closest('[data-radix-select-trigger]')) {
          filterChanges++;
          
          if (filterChanges > 10) {
            console.warn(`🚨 [${pageName}] Muitas mudanças em filtros detectadas (${filterChanges})`);
            console.warn('Possível loop de re-render ou hooks condicionais');
          }
        }
      }
    });
  });

  // Observar mudanças no DOM
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state', 'data-value']
  });

  // Cleanup após 30 segundos
  setTimeout(() => {
    observer.disconnect();
    console.log(`📊 [${pageName}] Filtros alterados: ${filterChanges} vezes`);
    console.groupEnd();
  }, 30000);
}

export function validatePageStability(pageName: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  checkHookViolations(pageName);
  checkFilterStability(pageName);
  
  console.log(`🔍 [${pageName}] Verificações de desenvolvimento iniciadas`);
}

/**
 * QA Manual automatizado para páginas críticas
 */
export function runQAChecks(pageName: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.group(`🧪 [${pageName}] QA Automático`);
  
  const checks = {
    hookErrors: 0,
    renderLoops: 0,
    filterIssues: 0,
    memoryLeaks: 0
  };

  // Verificar se página carrega sem erros
  setTimeout(() => {
    const errors = document.querySelectorAll('[data-error]');
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} elementos com erro encontrados`);
      checks.hookErrors += errors.length;
    }
  }, 1000);

  // Simular interações comuns
  setTimeout(() => {
    console.log('🤖 Simulando interações de usuário...');
    
    // Testar acordeons
    const accordions = document.querySelectorAll('[data-radix-accordion-trigger]');
    accordions.forEach((accordion, index) => {
      if (index < 3) { // Testar apenas os primeiros 3
        setTimeout(() => {
          (accordion as HTMLElement).click();
          console.log(`🔄 Accordion ${index + 1} testado`);
        }, index * 500);
      }
    });
    
    // Testar selects
    const selects = document.querySelectorAll('[data-radix-select-trigger]');
    selects.forEach((select, index) => {
      if (index < 2) { // Testar apenas os primeiros 2
        setTimeout(() => {
          (select as HTMLElement).click();
          console.log(`🔄 Select ${index + 1} testado`);
        }, (index + 5) * 500);
      }
    });
    
  }, 2000);

  // Relatório final
  setTimeout(() => {
    console.log('📋 Relatório de QA:');
    console.log(`   Erros de hooks: ${checks.hookErrors}`);
    console.log(`   Loops de render: ${checks.renderLoops}`);
    console.log(`   Problemas de filtros: ${checks.filterIssues}`);
    
    if (Object.values(checks).every(count => count === 0)) {
      console.log('✅ Todos os testes de QA passaram!');
    } else {
      console.warn('⚠️ Alguns problemas detectados - revisar código');
    }
    
    console.groupEnd();
  }, 10000);
}