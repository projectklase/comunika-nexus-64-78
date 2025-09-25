import { useEffect } from 'react';

/**
 * Hook to validate Select components and prevent empty value errors
 * Only runs in development mode
 */
export function useSelectValidation(pageName: string = 'Unknown') {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const validateSelectComponents = () => {
      // Check for empty values in SelectItem components
      const selectItems = document.querySelectorAll('[data-radix-select-item]');
      const emptyItems: Element[] = [];

      selectItems.forEach((item) => {
        const value = item.getAttribute('data-value');
        if (value === '' || value === null) {
          emptyItems.push(item);
        }
      });

      if (emptyItems.length > 0) {
        console.warn(`🚨 [${pageName}] Found ${emptyItems.length} SelectItem components with empty values:`, emptyItems);
        emptyItems.forEach((item, index) => {
          console.warn(`   ${index + 1}. "${item.textContent?.trim()}" has value: "${item.getAttribute('data-value')}"`);
        });
      }

      // Check for Select triggers with empty values
      const selectTriggers = document.querySelectorAll('[data-radix-select-trigger]');
      const emptyTriggers: Element[] = [];

      selectTriggers.forEach((trigger) => {
        const value = trigger.getAttribute('data-value');
        if (value === '') {
          emptyTriggers.push(trigger);
        }
      });

      if (emptyTriggers.length > 0) {
        console.warn(`🚨 [${pageName}] Found ${emptyTriggers.length} Select triggers with empty values:`, emptyTriggers);
      }

      if (emptyItems.length === 0 && emptyTriggers.length === 0) {
        console.log(`✅ [${pageName}] All Select components validated successfully - no empty values found`);
      }
    };

    // Run validation after a delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(validateSelectComponents, 1500);

    return () => clearTimeout(timeoutId);
  }, [pageName]);
}

/**
 * Global validation function that can be called from anywhere
 */
export function validateAllSelects(context: string = 'Global'): void {
  if (process.env.NODE_ENV !== 'development') return;

  const issues: string[] = [];

  // Check all SelectItem components
  const selectItems = document.querySelectorAll('[data-radix-select-item]');
  selectItems.forEach((item) => {
    const value = item.getAttribute('data-value');
    if (value === '' || value === null) {
      issues.push(`SelectItem "${item.textContent?.trim()}" has empty value`);
    }
  });

  // Check all Select state
  const selectTriggers = document.querySelectorAll('[data-radix-select-trigger]');
  selectTriggers.forEach((trigger) => {
    const value = trigger.getAttribute('data-value');
    if (value === '') {
      issues.push(`Select trigger has empty value`);
    }
  });

  if (issues.length > 0) {
    console.error(`🚨 [${context}] Found ${issues.length} Select validation issues:`, issues);
  } else {
    console.log(`✅ [${context}] All Select components valid`);
  }
}