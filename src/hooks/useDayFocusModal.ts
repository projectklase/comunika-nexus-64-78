import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, isValid, parse } from 'date-fns';

interface DayFocusState {
  isOpen: boolean;
  date: Date | null;
}

export function useDayFocusModal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<DayFocusState>({
    isOpen: false,
    date: null,
  });

  // Restore from URL on mount - simplified to prevent loops
  useEffect(() => {
    const dateParam = searchParams.get('d');
    const modalParam = searchParams.get('modal');
    const drawerParam = searchParams.get('drawer');
    
    // Don't interfere if activity drawer is open
    if (drawerParam === 'activity') {
      if (state.isOpen) {
        setState({
          isOpen: false,
          date: null,
        });
      }
      return;
    }
    
    if (modalParam === 'day' && dateParam) {
      try {
        const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
        if (isValid(parsedDate) && !state.isOpen) {
          setState({
            isOpen: true,
            date: parsedDate,
          });
        }
      } catch {
        // Invalid date, ignore
      }
    } else if (modalParam !== 'day' && state.isOpen) {
      setState({
        isOpen: false,
        date: null,
      });
    }
  }, [searchParams.get('d'), searchParams.get('modal'), searchParams.get('drawer')]);

  const openModal = useCallback((date: Date, updateUrl: boolean = true) => {
    setState(prevState => {
      // Prevent unnecessary updates if already open with same date
      if (prevState.isOpen && prevState.date && 
          prevState.date.getTime() === date.getTime()) {
        return prevState;
      }
      return {
        isOpen: true,
        date,
      };
    });

    if (updateUrl) {
      const params = new URLSearchParams(window.location.search);
      params.set('modal', 'day');
      params.set('d', format(date, 'yyyy-MM-dd'));
      navigate(`${window.location.pathname}?${params.toString()}`, { replace: true });
    }
  }, [navigate]);

  const closeModal = useCallback((updateUrl: boolean = true) => {
    // Clear all modal state completely
    setState({
      isOpen: false,
      date: null,
    });

    if (updateUrl) {
      const params = new URLSearchParams(window.location.search);
      params.delete('modal');
      params.delete('d');
      params.delete('date'); // Also clear unified calendar focus params
      params.delete('focusId');
      params.delete('postId');
      params.delete('focusType');
      const queryString = params.toString();
      navigate(queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname, { replace: true });
    }
  }, [navigate]);

  return {
    isOpen: state.isOpen,
    date: state.date,
    openModal,
    closeModal,
  };
}