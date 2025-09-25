import { useState, useCallback } from 'react';
import { isHoliday, Holiday } from '@/utils/br-holidays';

interface HolidayWarningState {
  isOpen: boolean;
  holiday: Holiday | null;
  onConfirm: (() => void) | null;
}

export function useHolidayWarning() {
  const [warningState, setWarningState] = useState<HolidayWarningState>({
    isOpen: false,
    holiday: null,
    onConfirm: null,
  });

  const checkDateForHoliday = useCallback((dateStr: string, onConfirm: () => void): boolean => {
    if (!dateStr) return true; // Allow empty dates

    // Parse Brazilian date format dd/mm/yyyy
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year) return true;

    const date = new Date(year, month - 1, day);
    const holiday = isHoliday(date);

    if (holiday && holiday.type === 'national') {
      setWarningState({
        isOpen: true,
        holiday,
        onConfirm,
      });
      return false; // Block submission until user confirms
    }

    return true; // No holiday or not national, proceed
  }, []);

  const confirmHoliday = useCallback(() => {
    if (warningState.onConfirm) {
      warningState.onConfirm();
    }
    setWarningState({
      isOpen: false,
      holiday: null,
      onConfirm: null,
    });
  }, [warningState.onConfirm]);

  const cancelHoliday = useCallback(() => {
    setWarningState({
      isOpen: false,
      holiday: null,
      onConfirm: null,
    });
  }, []);

  return {
    warningState,
    checkDateForHoliday,
    confirmHoliday,
    cancelHoliday,
  };
}